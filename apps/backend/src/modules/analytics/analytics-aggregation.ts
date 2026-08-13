import { SubmissionStatus } from '../submissions/entities/submission.entity';

/**
 * Pure arithmetic behind the analytics endpoints.
 *
 * Nothing here touches TypeORM or the request context: the service runs the
 * queries, coerces Postgres' string numerics, and hands plain arrays over. That
 * keeps percentiles, conversion rates, month bucketing and funnel counting
 * testable without a database.
 */

/** One row of `GROUP BY status`. */
export interface StatusCountRow {
  status: string;
  count: number;
}

/** Every submission status, zero-filled. */
export type StatusTotals = Record<string, number>;

/** Hours between a submission leaving draft and its first quote. */
export interface QuoteLatencyRow {
  lineOfBusiness: string;
  hours: number;
}

/** One row of `GROUP BY month, lineOfBusiness`. */
export interface MonthlyVolumeRow {
  month: string;
  lineOfBusiness: string;
  count: number;
}

export interface LatencyBreakdown {
  lineOfBusiness: string;
  sampleSize: number;
  averageHours: number | null;
  medianHours: number | null;
}

export interface LatencySummary {
  sampleSize: number;
  averageHours: number | null;
  medianHours: number | null;
  p90Hours: number | null;
  fastestHours: number | null;
  slowestHours: number | null;
  byLineOfBusiness: LatencyBreakdown[];
}

export interface VolumeSeries {
  lineOfBusiness: string;
  counts: number[];
  total: number;
}

export interface VolumeReport {
  months: string[];
  totals: number[];
  totalCount: number;
  series: VolumeSeries[];
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  /** Percent of the submissions that reached the previous stage. */
  ofPrevious: number;
  /** Percent of the submissions that entered the funnel at all. */
  ofStart: number;
}

export interface FunnelReport {
  stages: FunnelStage[];
  exits: { declined: number; expired: number };
}

export interface ConversionSummary {
  bound: number;
  declined: number;
  decided: number;
  /** Bound as a percentage of everything that reached a final decision. */
  conversionRate: number;
  declineRate: number;
}

/**
 * The happy path through the lifecycle, in order. Mirrors the transition table
 * in SubmissionsService.updateStatus().
 */
export const LIFECYCLE_STAGES: SubmissionStatus[] = [
  SubmissionStatus.DRAFT,
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.UNDER_REVIEW,
  SubmissionStatus.QUOTED,
  SubmissionStatus.NEGOTIATING,
  SubmissionStatus.BOUND,
];

/**
 * How far a submission is *known* to have travelled before it dropped out. A
 * status alone cannot say more than this: 'declined' is reachable from
 * 'submitted' onwards and 'expired' only from 'quoted' onwards, so those are the
 * furthest stages we can credit them with without replaying their history.
 */
const EXIT_MINIMUM_STAGE: Record<string, SubmissionStatus> = {
  [SubmissionStatus.DECLINED]: SubmissionStatus.SUBMITTED,
  [SubmissionStatus.EXPIRED]: SubmissionStatus.QUOTED,
};

/** 'under_review' -> 'Under review'. */
export function humaniseStatus(status: string): string {
  const spaced = String(status).replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function roundTo(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Percentage guarded against a zero (or negative) denominator. */
export function percentage(numerator: number, denominator: number, decimals = 1): number {
  if (!denominator || denominator <= 0) return 0;
  return roundTo((numerator / denominator) * 100, decimals);
}

/** Null on an empty sample rather than NaN, so callers can render a dash. */
export function average(values: number[], decimals = 1): number | null {
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return roundTo(total / values.length, decimals);
}

/**
 * Linear-interpolated percentile. p is a fraction (0.5 is the median), clamped
 * so a caller passing 90 instead of 0.9 cannot walk off the end of the array.
 */
export function percentile(values: number[], p: number, decimals = 1): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return roundTo(sorted[0], decimals);

  const fraction = Math.min(1, Math.max(0, p));
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return roundTo(sorted[lower], decimals);

  const weight = position - lower;
  return roundTo(sorted[lower] * (1 - weight) + sorted[upper] * weight, decimals);
}

/** Even-length samples average the two middle values. */
export function median(values: number[], decimals = 1): number | null {
  return percentile(values, 0.5, decimals);
}

/** Zero-fills every known status so the client never has to guess at gaps. */
export function toStatusTotals(rows: StatusCountRow[]): StatusTotals {
  const totals: StatusTotals = {};
  for (const status of Object.values(SubmissionStatus)) {
    totals[status] = 0;
  }
  for (const row of rows) {
    if (!row || typeof row.status !== 'string') continue;
    const count = Number(row.count);
    if (!Number.isFinite(count)) continue;
    totals[row.status] = (totals[row.status] ?? 0) + count;
  }
  return totals;
}

export function totalOf(totals: StatusTotals): number {
  return Object.values(totals).reduce((sum, value) => sum + value, 0);
}

/**
 * Bound business as a share of everything that actually reached a decision.
 * Submissions still in flight are deliberately excluded from the denominator,
 * otherwise a busy pipeline reads as a falling conversion rate.
 */
export function conversionSummary(totals: StatusTotals): ConversionSummary {
  const bound = totals[SubmissionStatus.BOUND] ?? 0;
  const declined = totals[SubmissionStatus.DECLINED] ?? 0;
  const decided = bound + declined;

  return {
    bound,
    declined,
    decided,
    conversionRate: percentage(bound, decided),
    declineRate: percentage(declined, decided),
  };
}

/**
 * Time from leaving draft to the first quote. Rows with a negative or
 * non-finite gap are dropped: they mean the underlying timestamps disagree, and
 * a single bad row would otherwise drag the average anywhere.
 */
export function summariseLatency(rows: QuoteLatencyRow[]): LatencySummary {
  const clean = rows.filter(
    (row) => row && Number.isFinite(Number(row.hours)) && Number(row.hours) >= 0,
  );
  const hours = clean.map((row) => Number(row.hours));

  const groups = new Map<string, number[]>();
  for (const row of clean) {
    const key = row.lineOfBusiness ?? 'unknown';
    const bucket = groups.get(key);
    if (bucket) bucket.push(Number(row.hours));
    else groups.set(key, [Number(row.hours)]);
  }

  const byLineOfBusiness: LatencyBreakdown[] = [...groups.entries()]
    .map(([lineOfBusiness, values]) => ({
      lineOfBusiness,
      sampleSize: values.length,
      averageHours: average(values),
      medianHours: median(values),
    }))
    .sort(
      (a, b) =>
        b.sampleSize - a.sampleSize || a.lineOfBusiness.localeCompare(b.lineOfBusiness),
    );

  return {
    sampleSize: hours.length,
    averageHours: average(hours),
    medianHours: median(hours),
    p90Hours: percentile(hours, 0.9),
    fastestHours: hours.length ? roundTo(Math.min(...hours)) : null,
    slowestHours: hours.length ? roundTo(Math.max(...hours)) : null,
    byLineOfBusiness,
  };
}

/** The `months` calendar months ending with the one containing `reference`, UTC. */
export function monthKeysEndingAt(reference: Date, months: number): string[] {
  if (!Number.isFinite(months) || months <= 0) return [];
  const keys: string[] = [];
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const point = new Date(Date.UTC(year, month - offset, 1));
    const label = `${point.getUTCFullYear()}-${String(point.getUTCMonth() + 1).padStart(2, '0')}`;
    keys.push(label);
  }
  return keys;
}

/** First instant of a 'YYYY-MM' key, for use as a query lower bound. */
export function monthKeyStart(key: string): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, 1));
}

/**
 * Lays grouped rows onto a fixed month axis so months with no submissions still
 * appear. Rows outside the axis are ignored rather than silently folded in.
 */
export function buildVolumeSeries(rows: MonthlyVolumeRow[], months: string[]): VolumeReport {
  const index = new Map(months.map((month, position) => [month, position]));
  const byLine = new Map<string, number[]>();
  const totals = months.map(() => 0);

  for (const row of rows) {
    if (!row) continue;
    const position = index.get(row.month);
    if (position === undefined) continue;
    const count = Number(row.count);
    if (!Number.isFinite(count)) continue;

    const key = row.lineOfBusiness ?? 'unknown';
    let counts = byLine.get(key);
    if (!counts) {
      counts = months.map(() => 0);
      byLine.set(key, counts);
    }
    counts[position] += count;
    totals[position] += count;
  }

  const series: VolumeSeries[] = [...byLine.entries()]
    .map(([lineOfBusiness, counts]) => ({
      lineOfBusiness,
      counts,
      total: counts.reduce((sum, value) => sum + value, 0),
    }))
    .sort((a, b) => b.total - a.total || a.lineOfBusiness.localeCompare(b.lineOfBusiness));

  return {
    months,
    totals,
    totalCount: totals.reduce((sum, value) => sum + value, 0),
    series,
  };
}

/**
 * How many submissions reached each stage. A submission sitting at 'bound' has
 * been through every earlier stage, so each stage counts everything at or past
 * it; the two off-ramps are credited only as far as the lifecycle proves they
 * must have travelled (see EXIT_MINIMUM_STAGE).
 */
export function buildFunnel(totals: StatusTotals): FunnelReport {
  const position = new Map(LIFECYCLE_STAGES.map((stage, i) => [String(stage), i]));

  const reachedAt = (stageIndex: number): number => {
    let count = 0;
    for (const [status, value] of Object.entries(totals)) {
      const onPath = position.get(status);
      if (onPath !== undefined) {
        if (onPath >= stageIndex) count += value;
        continue;
      }
      const floorStage = EXIT_MINIMUM_STAGE[status];
      if (floorStage === undefined) continue;
      const floorIndex = position.get(String(floorStage));
      if (floorIndex !== undefined && floorIndex >= stageIndex) count += value;
    }
    return count;
  };

  const entered = reachedAt(0);
  const stages: FunnelStage[] = LIFECYCLE_STAGES.map((stage, i) => {
    const count = reachedAt(i);
    const previous = i === 0 ? count : reachedAt(i - 1);
    return {
      stage: String(stage),
      label: humaniseStatus(String(stage)),
      count,
      ofPrevious: i === 0 ? (count > 0 ? 100 : 0) : percentage(count, previous),
      ofStart: percentage(count, entered),
    };
  });

  return {
    stages,
    exits: {
      declined: totals[SubmissionStatus.DECLINED] ?? 0,
      expired: totals[SubmissionStatus.EXPIRED] ?? 0,
    },
  };
}
