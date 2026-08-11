import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote, QuoteStatus } from '../submissions/entities/quote.entity';
import { Submission, SubmissionStatus } from '../submissions/entities/submission.entity';
import { ChangeType } from '../submissions/entities/submission-history.entity';
import { Organization, OrganizationType } from '../organizations/entities/organization.entity';
import { SubmissionsService } from '../submissions/submissions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { QuoteActor, allowedQuoteTransitions, quoteTransitionAllowed } from './quote-transitions';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request';

/** Statuses at which a submission is open to the market. */
const QUOTABLE = [
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.UNDER_REVIEW,
  SubmissionStatus.QUOTED,
  SubmissionStatus.NEGOTIATING,
];

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private quotesRepository: Repository<Quote>,
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    private submissionsService: SubmissionsService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Which side of the placement this user sits on for this submission.
   * Brokers who raised the submission act on the cedant's behalf.
   */
  private resolveActor(submission: Submission, user: AuthenticatedUser): QuoteActor | 'admin' {
    if (user.roles.includes('super_admin')) return 'admin';
    if (
      submission.cedantId === user.organizationId ||
      submission.submittedById === user.userId
    ) {
      return 'cedant';
    }
    return 'reinsurer';
  }

  private async requireReinsurerOrg(user: AuthenticatedUser): Promise<Organization> {
    const org = await this.organizationsRepository.findOne({
      where: { id: user.organizationId },
    });
    if (!org) throw new NotFoundException('Your organization could not be found');
    if (org.type !== OrganizationType.REINSURER) {
      throw new ForbiddenException('Only reinsurer organizations can issue quotes');
    }
    return org;
  }

  async create(
    submissionId: string,
    dto: CreateQuoteDto,
    user: AuthenticatedUser,
  ): Promise<Quote> {
    const reinsurer = await this.requireReinsurerOrg(user);
    const submission = await this.submissionsService.findOne(submissionId);

    if (submission.cedantId === reinsurer.id) {
      throw new ForbiddenException('You cannot quote your own submission');
    }
    if (!QUOTABLE.includes(submission.status)) {
      throw new BadRequestException(
        `Submissions with status '${submission.status}' are not open for quoting`,
      );
    }

    const quote = this.quotesRepository.create({
      ...dto,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      submissionId,
      reinsurerId: reinsurer.id,
      submittedById: user.userId,
      status: QuoteStatus.INDICATION,
    });
    const saved = await this.quotesRepository.save(quote);

    // Only advance the submission when the state machine actually permits it;
    // a submission already QUOTED or NEGOTIATING is left where it is.
    if (submission.status === SubmissionStatus.UNDER_REVIEW) {
      await this.submissionsService.updateStatus(submissionId, SubmissionStatus.QUOTED);
    }

    await this.submissionsService.logHistory(
      submissionId,
      user.userId,
      ChangeType.QUOTE_RECEIVED,
      { quoteId: saved.id, reinsurer: reinsurer.name, quoteType: saved.quoteType },
    );

    await this.notifications.notifyOrganization(
      submission.cedantId,
      'quote_received',
      `New ${dto.quoteType.replace(/_/g, ' ')} from ${reinsurer.name}`,
      submission.title,
      { submissionId, quoteId: saved.id },
    );

    return saved;
  }

  /** Cedants see every quote on their submission; a reinsurer sees only its own. */
  async findForSubmission(submissionId: string, user: AuthenticatedUser): Promise<Quote[]> {
    const submission = await this.submissionsService.findOne(submissionId);
    const actor = this.resolveActor(submission, user);

    const where =
      actor === 'reinsurer'
        ? { submissionId, reinsurerId: user.organizationId }
        : { submissionId };

    return this.quotesRepository.find({
      where,
      relations: ['reinsurer', 'submittedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Quote> {
    const quote = await this.quotesRepository.findOne({
      where: { id },
      relations: ['reinsurer', 'submittedBy', 'submission'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    const actor = this.resolveActor(quote.submission, user);
    if (actor === 'reinsurer' && quote.reinsurerId !== user.organizationId) {
      throw new ForbiddenException('This quote belongs to another reinsurer');
    }
    return quote;
  }

  async updateStatus(
    id: string,
    dto: UpdateQuoteStatusDto,
    user: AuthenticatedUser,
  ): Promise<Quote> {
    const quote = await this.findOne(id, user);
    const resolved = this.resolveActor(quote.submission, user);
    // An admin is allowed to act, but the rules still need a side; treat as cedant.
    const actor: QuoteActor = resolved === 'admin' ? 'cedant' : resolved;

    if (!quoteTransitionAllowed(quote.status, dto.status, actor)) {
      const permitted = allowedQuoteTransitions(quote.status, actor);
      throw new ForbiddenException(
        permitted.length
          ? `As ${actor} you can move this quote to: ${permitted.join(', ')}`
          : `A quote that is ${quote.status} can no longer change`,
      );
    }
    if (dto.status === QuoteStatus.DECLINED && !dto.declineReason) {
      throw new BadRequestException('A reason is required when declining a quote');
    }

    const from = quote.status;
    quote.status = dto.status;
    if (dto.declineReason) quote.declineReason = dto.declineReason;
    const saved = await this.quotesRepository.save(quote);

    await this.submissionsService.logHistory(
      quote.submissionId,
      user.userId,
      ChangeType.QUOTE_STATUS_CHANGED,
      { quoteId: quote.id, from, to: dto.status },
    );

    // Tell the other side. The cedant acts, so the reinsurer hears about it.
    const audience = actor === 'cedant' ? quote.reinsurerId : quote.submission.cedantId;
    await this.notifications.notifyOrganization(
      audience,
      'quote_status_changed',
      `Quote ${dto.status.replace(/_/g, ' ')}`,
      quote.submission.title,
      { submissionId: quote.submissionId, quoteId: quote.id },
    );

    return saved;
  }

  /**
   * Side-by-side comparison for the cedant. Postgres returns DECIMAL as string,
   * so every figure is coerced before it reaches the client.
   */
  async comparisonMatrix(submissionId: string, user: AuthenticatedUser) {
    const submission = await this.submissionsService.findOne(submissionId);
    const actor = this.resolveActor(submission, user);
    if (actor === 'reinsurer') {
      throw new ForbiddenException('Only the ceding side can compare quotes');
    }

    const quotes = await this.quotesRepository.find({
      where: { submissionId },
      relations: ['reinsurer'],
    });

    const rows = quotes.map((quote) => ({
      quoteId: quote.id,
      reinsurer: quote.reinsurer?.name ?? 'Unknown',
      quoteType: quote.quoteType,
      status: quote.status,
      rate: Number(quote.rate),
      premium: Number(quote.premium),
      capacity: Number(quote.capacity),
      validUntil: quote.validUntil,
      terms: quote.terms,
      exclusions: quote.exclusions,
    }));

    const live = rows.filter((r) =>
      [QuoteStatus.INDICATION, QuoteStatus.FIRM_OFFER, QuoteStatus.ACCEPTED].includes(
        r.status as QuoteStatus,
      ),
    );

    rows.sort((a, b) => a.rate - b.rate);

    return {
      submissionId,
      sumInsured: submission.sumInsured ? Number(submission.sumInsured) : null,
      currency: submission.currency ?? null,
      quotes: rows,
      summary: {
        count: rows.length,
        // Capacity is a percentage share, so live offers tell the cedant how
        // much of the risk is actually covered so far.
        totalCapacityOffered: live.reduce((sum, r) => sum + r.capacity, 0),
        bestRate: live.length ? Math.min(...live.map((r) => r.rate)) : null,
        cheapestReinsurer: live.length
          ? live.reduce((best, r) => (r.rate < best.rate ? r : best)).reinsurer
          : null,
      },
    };
  }
}
