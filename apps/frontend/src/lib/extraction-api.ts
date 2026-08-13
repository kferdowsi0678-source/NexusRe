import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export type ExtractionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'reviewed'
  | 'failed'
  | 'unsupported';

export type ExtractionProvider = 'anthropic' | 'heuristic';

export type FieldReviewStatus = 'suggested' | 'accepted' | 'edited' | 'rejected';

export type FieldDecision = 'accept' | 'edit' | 'reject';

export interface ExtractedField {
  key: string;
  label: string;
  value: string | number | boolean | null;
  confidence: number;
  sourceHint?: string;
  status: FieldReviewStatus;
  correctedValue?: string | number | boolean | null;
}

export interface DocumentExtraction {
  id: string;
  documentId: string;
  submissionId: string;
  status: ExtractionStatus;
  provider?: ExtractionProvider;
  model?: string;
  fields?: ExtractedField[];
  summary?: string;
  coverage: number;
  errorMessage?: string;
  appliedKeys?: string[];
  reviewedAt?: string;
  createdAt: string;
  document?: { id: string; fileName: string; fileType: string };
  requestedBy?: { firstName: string; lastName: string };
  reviewedBy?: { firstName: string; lastName: string };
}

/** Matches LOW_CONFIDENCE_THRESHOLD on the server. */
export const LOW_CONFIDENCE = 0.6;

export const EXTRACTION_STATUS_COLORS: Record<ExtractionStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-amber-100 text-amber-800',
  reviewed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  unsupported: 'bg-gray-100 text-gray-600',
};

export const EXTRACTION_STATUS_LABELS: Record<ExtractionStatus, string> = {
  pending: 'Queued',
  processing: 'Reading',
  completed: 'Awaiting review',
  reviewed: 'Applied',
  failed: 'Failed',
  unsupported: 'Unsupported file',
};

export const FIELD_STATUS_COLORS: Record<FieldReviewStatus, string> = {
  suggested: 'bg-gray-100 text-gray-700',
  accepted: 'bg-green-100 text-green-800',
  edited: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
};

export const useExtractions = (submissionId: string) =>
  useQuery({
    queryKey: ['extractions', submissionId],
    queryFn: async () => {
      const res = await api.get<DocumentExtraction[]>(
        `/submissions/${submissionId}/extractions`,
      );
      return res.data;
    },
    enabled: !!submissionId,
  });

export const useRunExtraction = (submissionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const res = await api.post<DocumentExtraction>(
        `/submissions/${submissionId}/extractions`,
        { documentId },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extractions', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['documents', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission-history', submissionId] });
    },
  });
};

export const useReviewExtraction = (submissionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      extractionId: string;
      decisions: { key: string; decision: FieldDecision; correctedValue?: string }[];
    }) => {
      const res = await api.patch<DocumentExtraction>(
        `/submissions/${submissionId}/extractions/${payload.extractionId}/review`,
        { decisions: payload.decisions },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extractions', submissionId] });
    },
  });
};

export const useApplyExtraction = (submissionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (extractionId: string) => {
      const res = await api.post<{
        extraction: DocumentExtraction;
        appliedKeys: string[];
        completenessScore: number;
      }>(`/submissions/${submissionId}/extractions/${extractionId}/apply`, {});
      return res.data;
    },
    onSuccess: () => {
      // Applying rewrites riskDetails and the completeness score, so the
      // submission itself and its history both need refreshing.
      queryClient.invalidateQueries({ queryKey: ['extractions', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission-history', submissionId] });
    },
  });
};

/** Turns an axios failure into the server's message where there is one. */
export function extractionErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return error instanceof Error ? error.message : fallback;
}
