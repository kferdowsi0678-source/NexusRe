import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export type StructurePreference = 'proportional' | 'non_proportional' | 'any';

export interface RiskAppetite {
  id: string;
  name: string;
  reinsurerId: string;
  linesOfBusiness: string[];
  submissionTypes?: string[];
  countries?: string[];
  worldwide: boolean;
  structurePreference: StructurePreference;
  minSumInsured?: number | string | null;
  maxSumInsured?: number | string | null;
  currency?: string;
  maxCapacityShare?: number | string | null;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AppetiteMatchRow {
  appetiteId: string;
  appetiteName: string;
  reinsurerId: string;
  reinsurerName: string;
  maxCapacityShare: number | null;
  eligible: boolean;
  score: number;
  reasons: string[];
}

export interface Opportunity {
  submissionId: string;
  title: string;
  type: string;
  lineOfBusiness: string;
  status: string;
  sumInsured: number | null;
  currency: string | null;
  cedant: string;
  territory: string | null;
  matchedAppetite: string;
  score: number;
  reasons: string[];
}

export const useMyAppetites = (enabled = true) =>
  useQuery({
    queryKey: ['risk-appetite'],
    queryFn: async () => {
      const res = await api.get<RiskAppetite[]>('/risk-appetite');
      return res.data;
    },
    enabled,
    retry: false,
  });

export const useCreateAppetite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<RiskAppetite>) => {
      const res = await api.post<RiskAppetite>('/risk-appetite', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
};

export const useUpdateAppetite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RiskAppetite> }) => {
      const res = await api.patch<RiskAppetite>(`/risk-appetite/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
};

export const useDeleteAppetite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/risk-appetite/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
};

export const useSubmissionMatches = (submissionId: string, enabled = true) =>
  useQuery({
    queryKey: ['submission-matches', submissionId],
    queryFn: async () => {
      const res = await api.get<{
        submissionId: string;
        territory: string | null;
        matchCount: number;
        matches: AppetiteMatchRow[];
      }>(`/submissions/${submissionId}/matches`);
      return res.data;
    },
    enabled: !!submissionId && enabled,
  });

export const useOpportunities = (enabled = true) =>
  useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await api.get<{
        appetiteCount: number;
        matchCount: number;
        opportunities: Opportunity[];
      }>('/risk-appetite/opportunities');
      return res.data;
    },
    enabled,
    retry: false,
  });
