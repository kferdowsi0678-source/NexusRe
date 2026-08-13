import {
  MonthlyVolumeRow,
  QuoteLatencyRow,
  average,
  buildFunnel,
  buildVolumeSeries,
  conversionSummary,
  humaniseStatus,
  median,
  monthKeyStart,
  monthKeysEndingAt,
  percentage,
  percentile,
  summariseLatency,
  toStatusTotals,
  totalOf,
} from './analytics-aggregation';
import { SubmissionStatus } from '../submissions/entities/submission.entity';

const latency = (lineOfBusiness: string, hours: number): QuoteLatencyRow => ({
  lineOfBusiness,
  hours,
});

const volume = (month: string, lineOfBusiness: string, count: number): MonthlyVolumeRow => ({
  month,
  lineOfBusiness,
  count,
});

describe('average', () => {
  it('returns null for an empty sample rather than NaN', () => {
    expect(average([])).toBeNull();
  });

  it('returns the single value for a one-element sample', () => {
    expect(average([7.25])).toBe(7.3);
  });

  it('rounds to one decimal place by default', () => {
    expect(average([1, 2, 2])).toBe(1.7);
  });
});

describe('median', () => {
  it('returns null for an empty sample', () => {
    expect(median([])).toBeNull();
  });

  it('returns the only value for a single-element sample', () => {
    expect(median([12])).toBe(12);
  });

  it('takes the middle value of an odd-length sample', () => {
    expect(median([9, 1, 5])).toBe(5);
  });

  it('averages the two middle values of an even-length sample', () => {
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });

  it('does not depend on input order and does not mutate its input', () => {
    const input = [40, 10, 30, 20];
    expect(median(input)).toBe(25);
    expect(input).toEqual([40, 10, 30, 20]);
  });
});

describe('percentile', () => {
  it('interpolates between neighbouring values', () => {
    expect(percentile([0, 10], 0.9)).toBe(9);
  });

  it('clamps a fraction handed in out of range instead of reading off the end', () => {
    expect(percentile([1, 2, 3], 90)).toBe(3);
    expect(percentile([1, 2, 3], -4)).toBe(1);
  });

  it('returns null for an empty sample', () => {
    expect(percentile([], 0.9)).toBeNull();
  });
});

describe('percentage', () => {
  it('guards against division by zero', () => {
    expect(percentage(5, 0)).toBe(0);
    expect(percentage(0, 0)).toBe(0);
  });

  it('guards against a negative denominator', () => {
    expect(percentage(5, -2)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(percentage(1, 3)).toBe(33.3);
  });
});

describe('toStatusTotals', () => {
  it('zero-fills every status when nothing came back from the database', () => {
    const totals = toStatusTotals([]);
    expect(Object.keys(totals).sort()).toEqual(Object.values(SubmissionStatus).sort());
    expect(totalOf(totals)).toBe(0);
  });

  it('sums duplicate rows and ignores unusable ones', () => {
    const totals = toStatusTotals([
      { status: SubmissionStatus.BOUND, count: 2 },
      { status: SubmissionStatus.BOUND, count: 3 },
      { status: SubmissionStatus.DRAFT, count: Number.NaN },
    ]);
    expect(totals[SubmissionStatus.BOUND]).toBe(5);
    expect(totals[SubmissionStatus.DRAFT]).toBe(0);
  });
});

describe('conversionSummary', () => {
  it('reports a zero rate when nothing has been decided yet', () => {
    const summary = conversionSummary(
      toStatusTotals([{ status: SubmissionStatus.SUBMITTED, count: 4 }]),
    );
    expect(summary.decided).toBe(0);
    expect(summary.conversionRate).toBe(0);
    expect(summary.declineRate).toBe(0);
  });

  it('measures bound against decided business only, ignoring live submissions', () => {
    const summary = conversionSummary(
      toStatusTotals([
        { status: SubmissionStatus.BOUND, count: 3 },
        { status: SubmissionStatus.DECLINED, count: 1 },
        { status: SubmissionStatus.NEGOTIATING, count: 96 },
      ]),
    );
    expect(summary.conversionRate).toBe(75);
    expect(summary.declineRate).toBe(25);
  });
});

describe('summariseLatency', () => {
  it('returns nulls and a zero sample size for no data', () => {
    const summary = summariseLatency([]);
    expect(summary).toMatchObject({
      sampleSize: 0,
      averageHours: null,
      medianHours: null,
      p90Hours: null,
      fastestHours: null,
      slowestHours: null,
      byLineOfBusiness: [],
    });
  });

  it('handles a single quoted submission', () => {
    const summary = summariseLatency([latency('property', 6)]);
    expect(summary.sampleSize).toBe(1);
    expect(summary.averageHours).toBe(6);
    expect(summary.medianHours).toBe(6);
    expect(summary.p90Hours).toBe(6);
    expect(summary.byLineOfBusiness).toEqual([
      { lineOfBusiness: 'property', sampleSize: 1, averageHours: 6, medianHours: 6 },
    ]);
  });

  it('drops impossible rows so one bad timestamp cannot move the average', () => {
    const summary = summariseLatency([
      latency('property', 10),
      latency('property', -50),
      latency('property', Number.NaN),
    ]);
    expect(summary.sampleSize).toBe(1);
    expect(summary.averageHours).toBe(10);
  });

  it('separates the average from the median when a slow outlier is present', () => {
    const summary = summariseLatency([
      latency('marine', 1),
      latency('marine', 2),
      latency('marine', 3),
      latency('marine', 400),
    ]);
    expect(summary.medianHours).toBe(2.5);
    expect(summary.averageHours).toBe(101.5);
    expect(summary.fastestHours).toBe(1);
    expect(summary.slowestHours).toBe(400);
  });

  it('breaks down by line of business, busiest first then alphabetically', () => {
    const summary = summariseLatency([
      latency('property', 4),
      latency('property', 8),
      latency('marine', 2),
      latency('cyber', 6),
    ]);
    expect(summary.byLineOfBusiness.map((row) => row.lineOfBusiness)).toEqual([
      'property',
      'cyber',
      'marine',
    ]);
    expect(summary.byLineOfBusiness[0]).toMatchObject({ sampleSize: 2, averageHours: 6 });
  });
});

describe('monthKeysEndingAt', () => {
  it('returns twelve keys ending with the reference month', () => {
    const keys = monthKeysEndingAt(new Date('2026-08-12T00:00:00Z'), 12);
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe('2025-09');
    expect(keys[11]).toBe('2026-08');
  });

  it('rolls back over a year boundary and pads the month', () => {
    expect(monthKeysEndingAt(new Date('2026-01-31T00:00:00Z'), 3)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
  });

  it('returns nothing for a non-positive window', () => {
    expect(monthKeysEndingAt(new Date('2026-08-12T00:00:00Z'), 0)).toEqual([]);
  });

  it('turns a key back into the first instant of that month', () => {
    expect(monthKeyStart('2026-03').toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });
});

describe('buildVolumeSeries', () => {
  it('produces an empty but well-formed report when there are no rows', () => {
    const months = monthKeysEndingAt(new Date('2026-08-12T00:00:00Z'), 3);
    const report = buildVolumeSeries([], months);
    expect(report.months).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(report.totals).toEqual([0, 0, 0]);
    expect(report.totalCount).toBe(0);
    expect(report.series).toEqual([]);
  });

  it('keeps empty months on the axis and lines up counts by position', () => {
    const months = ['2026-06', '2026-07', '2026-08'];
    const report = buildVolumeSeries(
      [volume('2026-06', 'property', 2), volume('2026-08', 'property', 5)],
      months,
    );
    expect(report.series[0].counts).toEqual([2, 0, 5]);
    expect(report.totals).toEqual([2, 0, 5]);
    expect(report.totalCount).toBe(7);
  });

  it('ignores rows outside the requested window instead of folding them in', () => {
    const report = buildVolumeSeries(
      [volume('2024-01', 'property', 99), volume('2026-07', 'property', 1)],
      ['2026-06', '2026-07', '2026-08'],
    );
    expect(report.totalCount).toBe(1);
  });

  it('orders lines of business by total, breaking ties on name', () => {
    const months = ['2026-07', '2026-08'];
    const report = buildVolumeSeries(
      [
        volume('2026-07', 'marine', 1),
        volume('2026-08', 'marine', 1),
        volume('2026-07', 'property', 9),
        volume('2026-08', 'cyber', 2),
      ],
      months,
    );
    expect(report.series.map((s) => s.lineOfBusiness)).toEqual(['property', 'cyber', 'marine']);
    expect(report.series.map((s) => s.total)).toEqual([9, 2, 2]);
  });
});

describe('buildFunnel', () => {
  it('reports every stage at zero for an empty dataset without dividing by zero', () => {
    const report = buildFunnel(toStatusTotals([]));
    expect(report.stages).toHaveLength(6);
    expect(report.stages.every((stage) => stage.count === 0)).toBe(true);
    expect(report.stages.every((stage) => stage.ofStart === 0 && stage.ofPrevious === 0)).toBe(
      true,
    );
    expect(report.exits).toEqual({ declined: 0, expired: 0 });
  });

  it('credits a bound submission with every earlier stage', () => {
    const report = buildFunnel(toStatusTotals([{ status: SubmissionStatus.BOUND, count: 1 }]));
    expect(report.stages.map((stage) => stage.count)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(report.stages.map((stage) => stage.ofStart)).toEqual([100, 100, 100, 100, 100, 100]);
  });

  it('narrows stage by stage as submissions stall part-way through', () => {
    const report = buildFunnel(
      toStatusTotals([
        { status: SubmissionStatus.DRAFT, count: 4 },
        { status: SubmissionStatus.SUBMITTED, count: 3 },
        { status: SubmissionStatus.QUOTED, count: 2 },
        { status: SubmissionStatus.BOUND, count: 1 },
      ]),
    );
    expect(report.stages.map((stage) => stage.count)).toEqual([10, 6, 3, 3, 1, 1]);
    expect(report.stages[0].ofPrevious).toBe(100);
    expect(report.stages[1].ofPrevious).toBe(60);
  });

  it('credits an off-ramp only as far as the lifecycle proves it travelled', () => {
    const report = buildFunnel(
      toStatusTotals([
        { status: SubmissionStatus.DECLINED, count: 2 },
        { status: SubmissionStatus.EXPIRED, count: 1 },
      ]),
    );
    const byStage = Object.fromEntries(report.stages.map((stage) => [stage.stage, stage.count]));
    expect(byStage[SubmissionStatus.DRAFT]).toBe(3);
    expect(byStage[SubmissionStatus.SUBMITTED]).toBe(3);
    expect(byStage[SubmissionStatus.UNDER_REVIEW]).toBe(1);
    expect(byStage[SubmissionStatus.QUOTED]).toBe(1);
    expect(byStage[SubmissionStatus.NEGOTIATING]).toBe(0);
    expect(report.exits).toEqual({ declined: 2, expired: 1 });
  });
});

describe('humaniseStatus', () => {
  it('turns a status enum value into a readable label', () => {
    expect(humaniseStatus(SubmissionStatus.UNDER_REVIEW)).toBe('Under review');
  });
});
