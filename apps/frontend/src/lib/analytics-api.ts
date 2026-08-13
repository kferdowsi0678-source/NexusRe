import { useQuery } from '@tanstack/react-query';
import api from './api';

/** Optional reporting window. Only `from`/`to` are accepted by the backend DTO. */
export interface AnalyticsRange {
  from?: string;
  to?: string;
}

/** Which submissions the server counted for this caller. */
export type AnalyticsScope = 'all' | 'market' | 'organization';

export interface ResolvedRange {
  from: string | null;
  to: string | null;
}

export interface StatusBreakdown {
  status: string;
  label: string;
  count: number;
}

export interface ConversionSummary {
  bound: number;
  declined: number;
  decided: number;
  conversionRate: number;
  declineRate: number;
}

export interface AnalyticsOverview {
  scope: AnalyticsScope;
  range: ResolvedRange;
  totalSubmissions: number;
  totalQuotes: number;
  averageCompletenessScore: number;
  statusTotals: Record<string, number>;
  byStatus: StatusBreakdown[];
  conversion: ConversionSummary;
}

export interface LatencyBreakdown {
  lineOfBusiness: string;
  sampleSize: number;
  averageHours: number | null;
  medianHours: number | null;
}

export interface TimeToQuoteReport {
  scope: AnalyticsScope;
  range: ResolvedRange;
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
  scope: AnalyticsScope;
  range: ResolvedRange;
  months: string[];
  totals: number[];
  totalCount: number;
  series: VolumeSeries[];
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  ofPrevious: number;
  ofStart: number;
}

export interface FunnelReport {
  scope: AnalyticsScope;
  range: ResolvedRange;
  totalSubmissions: number;
  stages: FunnelStage[];
  exits: { declined: number; expired: number };
}

const toQueryString = (range?: AnalyticsRange) => {
  const params = new URLSearchParams();
  Object.entries(range || {}).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const useAnalyticsOverview = (range?: AnalyticsRange) =>
  useQuery({
    queryKey: ['analytics', 'overview', range],
    queryFn: async () => {
      const res = await api.get<AnalyticsOverview>(`/analytics/overview${toQueryString(range)}`);
      return res.data;
    },
  });

export const useTimeToQuote = (range?: AnalyticsRange) =>
  useQuery({
    queryKey: ['analytics', 'time-to-quote', range],
    queryFn: async () => {
      const res = await api.get<TimeToQuoteReport>(
        `/analytics/time-to-quote${toQueryString(range)}`,
      );
      return res.data;
    },
  });

export const useSubmissionVolume = (range?: AnalyticsRange) =>
  useQuery({
    queryKey: ['analytics', 'volume', range],
    queryFn: async () => {
      const res = await api.get<VolumeReport>(`/analytics/volume${toQueryString(range)}`);
      return res.data;
    },
  });

export const useSubmissionFunnel = (range?: AnalyticsRange) =>
  useQuery({
    queryKey: ['analytics', 'funnel', range],
    queryFn: async () => {
      const res = await api.get<FunnelReport>(`/analytics/funnel${toQueryString(range)}`);
      return res.data;
    },
  });
