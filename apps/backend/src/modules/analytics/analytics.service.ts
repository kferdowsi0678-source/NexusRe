import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Submission } from '../submissions/entities/submission.entity';
import { Quote } from '../submissions/entities/quote.entity';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request';
import { AnalyticsRangeDto } from './dto/analytics-range.dto';
import {
  MonthlyVolumeRow,
  QuoteLatencyRow,
  StatusCountRow,
  buildFunnel,
  buildVolumeSeries,
  conversionSummary,
  humaniseStatus,
  monthKeyStart,
  monthKeysEndingAt,
  roundTo,
  summariseLatency,
  toStatusTotals,
  totalOf,
} from './analytics-aggregation';

/** Matches the reinsurer roles the appetite and quotes modules already use. */
const REINSURER_ROLES = ['reinsurer_underwriter', 'reinsurer_admin'];

const VOLUME_MONTHS = 12;

/** Which submissions the caller is allowed to be counted over. */
export type AnalyticsScope = 'all' | 'market' | 'organization';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(Quote)
    private quotesRepository: Repository<Quote>,
  ) {}

  /**
   * Same rule the rest of the app enforces per record, expressed once as SQL:
   *
   * - super_admin sees everything;
   * - a reinsurer sees the submissions it was invited to (a thread names it as
   *   counterparty, exactly as MessagingService checks) or has quoted on, which
   *   is how QuotesService.resolveActor decides a reinsurer may look at a risk;
   * - everyone else is the ceding side, so its own organization's submissions
   *   plus anything the user raised themselves — the pair
   *   SubmissionsService/MessagingService treat as "cedant side".
   */
  private scopeOf(user: AuthenticatedUser): AnalyticsScope {
    if (user.roles?.includes('super_admin')) return 'all';
    if (user.roles?.some((role) => REINSURER_ROLES.includes(role))) return 'market';
    return 'organization';
  }

  private scopeClause(user: AuthenticatedUser): { clause: string; params: ObjectLiteral } {
    switch (this.scopeOf(user)) {
      case 'all':
        return { clause: '1 = 1', params: {} };
      case 'market':
        return {
          clause: `(
            EXISTS (
              SELECT 1 FROM "quotes" scope_quote
              WHERE scope_quote."submissionId" = submission."id"
                AND scope_quote."reinsurerId" = :scopeOrgId
            )
            OR EXISTS (
              SELECT 1 FROM "message_threads" scope_thread
              WHERE scope_thread."submissionId" = submission."id"
                AND scope_thread."counterpartyOrgId" = :scopeOrgId
            )
          )`,
          params: { scopeOrgId: user.organizationId ?? null },
        };
      default:
        return {
          clause: '(submission."cedantId" = :scopeOrgId OR submission."submittedById" = :scopeUserId)',
          params: {
            scopeOrgId: user.organizationId ?? null,
            scopeUserId: user.userId ?? null,
          },
        };
    }
  }

  /** Submissions this caller may be shown, narrowed to the reporting window. */
  private scopedSubmissions(
    user: AuthenticatedUser,
    range: AnalyticsRangeDto,
  ): SelectQueryBuilder<Submission> {
    const { clause, params } = this.scopeClause(user);
    const query = this.submissionsRepository
      .createQueryBuilder('submission')
      .where(clause, params);

    if (range.from) {
      query.andWhere('submission."createdAt" >= :from', { from: new Date(range.from) });
    }
    if (range.to) {
      query.andWhere('submission."createdAt" <= :to', { to: new Date(range.to) });
    }
    return query;
  }

  /**
   * A reinsurer never sees a competitor's quote elsewhere in the app, so its
   * quote-derived figures count only its own. Everyone else counts every quote
   * on the submissions already in scope.
   */
  private joinVisibleQuotes(
    query: SelectQueryBuilder<Submission>,
    user: AuthenticatedUser,
  ): SelectQueryBuilder<Submission> {
    if (this.scopeOf(user) === 'market') {
      return query.innerJoin(
        'submission.quotes',
        'quote',
        'quote."reinsurerId" = :visibleReinsurerId',
        { visibleReinsurerId: user.organizationId ?? null },
      );
    }
    return query.innerJoin('submission.quotes', 'quote');
  }

  private async statusRows(
    user: AuthenticatedUser,
    range: AnalyticsRangeDto,
  ): Promise<StatusCountRow[]> {
    const rows = await this.scopedSubmissions(user, range)
      .select('submission.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('submission.status')
      .getRawMany<{ status: string; count: string }>();

    return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
  }

  private describeRange(range: AnalyticsRangeDto) {
    return { from: range.from ?? null, to: range.to ?? null };
  }

  /** Headline counts: pipeline by status, quote volume, quality, conversion. */
  async overview(user: AuthenticatedUser, range: AnalyticsRangeDto) {
    const rows = await this.statusRows(user, range);
    const statusTotals = toStatusTotals(rows);

    const quality = await this.scopedSubmissions(user, range)
      .select('AVG(submission."completenessScore")', 'averageScore')
      .getRawOne<{ averageScore: string | null }>();

    const quotes = await this.joinVisibleQuotes(
      this.scopedSubmissions(user, range),
      user,
    )
      .select('COUNT(quote."id")', 'total')
      .getRawOne<{ total: string }>();

    const averageScore = Number(quality?.averageScore ?? 0);

    return {
      scope: this.scopeOf(user),
      range: this.describeRange(range),
      totalSubmissions: totalOf(statusTotals),
      totalQuotes: Number(quotes?.total ?? 0),
      averageCompletenessScore: Number.isFinite(averageScore) ? roundTo(averageScore) : 0,
      statusTotals,
      byStatus: Object.entries(statusTotals).map(([status, count]) => ({
        status,
        label: humaniseStatus(status),
        count,
      })),
      conversion: conversionSummary(statusTotals),
    };
  }

  /**
   * Hours between a submission leaving draft (submittedAt) and the first quote
   * landing on it, overall and per line of business.
   */
  async timeToQuote(user: AuthenticatedUser, range: AnalyticsRangeDto) {
    const query = this.joinVisibleQuotes(this.scopedSubmissions(user, range), user)
      .andWhere('submission."submittedAt" IS NOT NULL')
      .select('submission."lineOfBusiness"', 'lineOfBusiness')
      .addSelect(
        'EXTRACT(EPOCH FROM (MIN(quote."createdAt") - submission."submittedAt")) / 3600',
        'hours',
      )
      .groupBy('submission."id"')
      .addGroupBy('submission."lineOfBusiness"')
      .addGroupBy('submission."submittedAt"');

    const raw = await query.getRawMany<{ lineOfBusiness: string; hours: string }>();
    const rows: QuoteLatencyRow[] = raw.map((row) => ({
      lineOfBusiness: row.lineOfBusiness,
      hours: Number(row.hours),
    }));

    return {
      scope: this.scopeOf(user),
      range: this.describeRange(range),
      ...summariseLatency(rows),
    };
  }

  /** Submissions created per month for the last 12 months, split by line. */
  async volume(user: AuthenticatedUser, range: AnalyticsRangeDto) {
    const anchor = range.to ? new Date(range.to) : new Date();
    const months = monthKeysEndingAt(anchor, VOLUME_MONTHS);
    const windowStart = monthKeyStart(months[0]);

    const monthExpression = `TO_CHAR(DATE_TRUNC('month', submission."createdAt"), 'YYYY-MM')`;

    const raw = await this.scopedSubmissions(user, range)
      .andWhere('submission."createdAt" >= :windowStart', { windowStart })
      .select(monthExpression, 'month')
      .addSelect('submission."lineOfBusiness"', 'lineOfBusiness')
      .addSelect('COUNT(*)', 'count')
      .groupBy(monthExpression)
      .addGroupBy('submission."lineOfBusiness"')
      .getRawMany<{ month: string; lineOfBusiness: string; count: string }>();

    const rows: MonthlyVolumeRow[] = raw.map((row) => ({
      month: row.month,
      lineOfBusiness: row.lineOfBusiness,
      count: Number(row.count),
    }));

    return {
      scope: this.scopeOf(user),
      range: this.describeRange(range),
      ...buildVolumeSeries(rows, months),
    };
  }

  /** How many submissions reached each stage of the lifecycle. */
  async funnel(user: AuthenticatedUser, range: AnalyticsRangeDto) {
    const statusTotals = toStatusTotals(await this.statusRows(user, range));

    return {
      scope: this.scopeOf(user),
      range: this.describeRange(range),
      totalSubmissions: totalOf(statusTotals),
      ...buildFunnel(statusTotals),
    };
  }
}
