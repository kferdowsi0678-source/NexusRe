import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export type QuoteType = 'indication' | 'firm_order' | 'binding';
export type QuoteStatus = 'indication' | 'firm_offer' | 'declined' | 'accepted' | 'expired';
export type QuoteActor = 'reinsurer' | 'cedant';

export const QUOTE_TYPES: { value: QuoteType; label: string }[] = [
  { value: 'indication', label: 'Indication' },
  { value: 'firm_order', label: 'Firm order' },
  { value: 'binding', label: 'Binding' },
];

export interface Quote {
  id: string;
  submissionId: string;
  reinsurerId: string;
  reinsurer?: { id: string; name: string };
  submittedBy?: { firstName: string; lastName: string };
  quoteType: QuoteType;
  status: QuoteStatus;
  rate: number | string;
  premium: number | string;
  capacity: number | string;
  terms?: string;
  conditions?: string;
  exclusions?: string;
  declineReason?: string;
  validUntil?: string;
  createdAt: string;
}

export interface QuoteComparison {
  submissionId: string;
  sumInsured: number | null;
  currency: string | null;
  quotes: {
    quoteId: string;
    reinsurer: string;
    quoteType: QuoteType;
    status: QuoteStatus;
    rate: number;
    premium: number;
    capacity: number;
    validUntil?: string;
    terms?: string;
    exclusions?: string;
  }[];
  summary: {
    count: number;
    totalCapacityOffered: number;
    bestRate: number | null;
    cheapestReinsurer: string | null;
  };
}

/**
 * Mirrors the server's rules so the UI only offers legal moves.
 * apps/backend/src/modules/quotes/quote-transitions.ts is authoritative.
 */
const TRANSITIONS: Record<QuoteStatus, { to: QuoteStatus; by: QuoteActor[] }[]> = {
  indication: [
    { to: 'firm_offer', by: ['reinsurer'] },
    { to: 'declined', by: ['reinsurer', 'cedant'] },
    { to: 'expired', by: ['reinsurer'] },
  ],
  firm_offer: [
    { to: 'accepted', by: ['cedant'] },
    { to: 'declined', by: ['reinsurer', 'cedant'] },
    { to: 'expired', by: ['reinsurer'] },
  ],
  accepted: [],
  declined: [],
  expired: [],
};

export function allowedQuoteTransitions(from: QuoteStatus, actor: QuoteActor): QuoteStatus[] {
  return (TRANSITIONS[from] ?? []).filter((t) => t.by.includes(actor)).map((t) => t.to);
}

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  indication: 'bg-blue-100 text-blue-800',
  firm_offer: 'bg-purple-100 text-purple-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

export const useQuotes = (submissionId: string) =>
  useQuery({
    queryKey: ['quotes', submissionId],
    queryFn: async () => {
      const res = await api.get<Quote[]>(`/submissions/${submissionId}/quotes`);
      return res.data;
    },
    enabled: !!submissionId,
  });

export const useQuoteComparison = (submissionId: string, enabled = true) =>
  useQuery({
    queryKey: ['quote-comparison', submissionId],
    queryFn: async () => {
      const res = await api.get<QuoteComparison>(
        `/submissions/${submissionId}/quotes/comparison`,
      );
      return res.data;
    },
    enabled: !!submissionId && enabled,
    retry: false,
  });

export const useCreateQuote = (submissionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      quoteType: QuoteType;
      rate: number;
      premium: number;
      capacity: number;
      terms?: string;
      conditions?: string;
      exclusions?: string;
      validUntil?: string;
    }) => {
      const res = await api.post<Quote>(`/submissions/${submissionId}/quotes`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['quote-comparison', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission-history', submissionId] });
    },
  });
};

export const useUpdateQuoteStatus = (submissionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      quoteId: string;
      status: QuoteStatus;
      declineReason?: string;
    }) => {
      const res = await api.patch<Quote>(`/quotes/${payload.quoteId}/status`, {
        status: payload.status,
        declineReason: payload.declineReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['quote-comparison', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission-history', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
