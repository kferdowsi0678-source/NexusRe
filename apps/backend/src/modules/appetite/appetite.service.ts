import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RiskAppetite } from './entities/risk-appetite.entity';
import { Organization, OrganizationType } from '../organizations/entities/organization.entity';
import { Submission, SubmissionStatus } from '../submissions/entities/submission.entity';
import { CreateRiskAppetiteDto } from './dto/create-risk-appetite.dto';
import { UpdateRiskAppetiteDto } from './dto/update-risk-appetite.dto';
import { MatchableSubmission, matchAppetite, rankMatches } from './appetite-matching';
import {
  BlendedMatch,
  blendAiAssessments,
  rankBlendedMatches,
  withoutAi,
} from './appetite-ai-ranking';
import { MarketIntelligenceService } from './market-intelligence.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request';

/** Submissions that are actually open to being matched to a market. */
const OPEN_STATUSES = [
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.UNDER_REVIEW,
  SubmissionStatus.QUOTED,
  SubmissionStatus.NEGOTIATING,
];

@Injectable()
export class AppetiteService {
  constructor(
    @InjectRepository(RiskAppetite)
    private appetiteRepository: Repository<RiskAppetite>,
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    private readonly marketIntelligence: MarketIntelligenceService,
  ) {}

  private async requireReinsurerOrg(user: AuthenticatedUser): Promise<Organization> {
    const org = await this.organizationsRepository.findOne({
      where: { id: user.organizationId },
    });
    if (!org) throw new NotFoundException('Your organization could not be found');
    if (org.type !== OrganizationType.REINSURER) {
      throw new ForbiddenException('Only reinsurer organizations can define risk appetite');
    }
    return org;
  }

  async create(dto: CreateRiskAppetiteDto, user: AuthenticatedUser): Promise<RiskAppetite> {
    const org = await this.requireReinsurerOrg(user);
    const appetite = this.appetiteRepository.create({ ...dto, reinsurerId: org.id });
    return this.appetiteRepository.save(appetite);
  }

  /** A reinsurer only ever sees its own appetite definitions. */
  async findMine(user: AuthenticatedUser): Promise<RiskAppetite[]> {
    return this.appetiteRepository.find({
      where: { reinsurerId: user.organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneOwned(id: string, user: AuthenticatedUser): Promise<RiskAppetite> {
    const appetite = await this.appetiteRepository.findOne({ where: { id } });
    if (!appetite) throw new NotFoundException('Risk appetite not found');
    if (
      appetite.reinsurerId !== user.organizationId &&
      !user.roles.includes('super_admin')
    ) {
      throw new ForbiddenException('This appetite belongs to another organization');
    }
    return appetite;
  }

  async update(
    id: string,
    dto: UpdateRiskAppetiteDto,
    user: AuthenticatedUser,
  ): Promise<RiskAppetite> {
    const appetite = await this.findOneOwned(id, user);
    Object.assign(appetite, dto);
    return this.appetiteRepository.save(appetite);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const appetite = await this.findOneOwned(id, user);
    await this.appetiteRepository.remove(appetite);
  }

  /**
   * Suggest markets for a submission. The risk's territory is taken from the
   * cedant's country, which is the closest thing the current model has.
   */
  async matchesForSubmission(submissionId: string, useAi = true) {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['cedant'],
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const appetites = await this.appetiteRepository.find({
      where: { isActive: true },
      relations: ['reinsurer'],
    });

    const target: MatchableSubmission = {
      lineOfBusiness: submission.lineOfBusiness,
      type: submission.type,
      sumInsured: submission.sumInsured != null ? Number(submission.sumInsured) : null,
      country: submission.cedant?.country ?? null,
    };

    const rows = appetites
      .map((appetite) => {
        const result = matchAppetite(target, appetite);
        return {
          appetiteId: appetite.id,
          appetiteName: appetite.name,
          reinsurerId: appetite.reinsurerId,
          reinsurerName: appetite.reinsurer?.name ?? 'Unknown',
          maxCapacityShare:
            appetite.maxCapacityShare != null ? Number(appetite.maxCapacityShare) : null,
          ...result,
        };
      })
      .filter((row) => row.eligible);

    // The rule ranking is what gets returned if the model is unavailable or
    // says nothing useful, so it is computed first and never depended on the
    // AI step succeeding.
    const ruleRanked = rankMatches(rows);

    let matches: BlendedMatch[] = withoutAi(ruleRanked);
    let assisted = false;

    if (useAi && this.marketIntelligence.isAvailable) {
      const assessments = await this.marketIntelligence.assess(
        { ...target, title: submission.title, description: submission.description },
        ruleRanked,
      );
      if (assessments.length > 0) {
        matches = rankBlendedMatches(blendAiAssessments(ruleRanked, assessments));
        assisted = true;
      }
    }

    return {
      submissionId,
      territory: target.country,
      matchCount: matches.length,
      /** True when model rationale is present; the UI badges these rows. */
      aiAssisted: assisted,
      matches,
    };
  }

  /** The reverse view: open submissions that fit this reinsurer's appetite. */
  async opportunitiesForReinsurer(user: AuthenticatedUser) {
    const appetites = await this.appetiteRepository.find({
      where: { reinsurerId: user.organizationId, isActive: true },
      relations: ['reinsurer'],
    });
    if (!appetites.length) return { appetiteCount: 0, matchCount: 0, opportunities: [] };

    const submissions = await this.submissionsRepository.find({
      where: { status: In(OPEN_STATUSES) },
      relations: ['cedant'],
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const opportunities = submissions
      .filter((submission) => submission.cedantId !== user.organizationId)
      .map((submission) => {
        const target: MatchableSubmission = {
          lineOfBusiness: submission.lineOfBusiness,
          type: submission.type,
          sumInsured: submission.sumInsured != null ? Number(submission.sumInsured) : null,
          country: submission.cedant?.country ?? null,
        };
        // Best-fitting appetite wins, so one strong match is not hidden by a weak one.
        const scored = appetites
          .map((appetite) => ({ appetite, result: matchAppetite(target, appetite) }))
          .filter((row) => row.result.eligible)
          .sort((a, b) => b.result.score - a.result.score)[0];

        if (!scored) return null;
        return {
          submissionId: submission.id,
          title: submission.title,
          type: submission.type,
          lineOfBusiness: submission.lineOfBusiness,
          status: submission.status,
          sumInsured: submission.sumInsured != null ? Number(submission.sumInsured) : null,
          currency: submission.currency ?? null,
          cedant: submission.cedant?.name ?? 'Unknown',
          territory: target.country,
          matchedAppetite: scored.appetite.name,
          reinsurerName: scored.appetite.reinsurer?.name ?? 'Unknown',
          score: scored.result.score,
          reasons: scored.result.reasons,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return {
      appetiteCount: appetites.length,
      matchCount: opportunities.length,
      opportunities: rankMatches(opportunities),
    };
  }
}
