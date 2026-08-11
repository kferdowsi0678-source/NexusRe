import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';

export interface Submission {
  id: string;
  title: string;
  type: 'treaty' | 'facultative';
  lineOfBusiness: string;
  status: string;
  description?: string;
  sumInsured?: number;
  currency?: string;
  inceptionDate?: string;
  expiryDate?: string;
  riskDetails?: Record<string, any>;
  lossHistory?: Record<string, any>;
  completenessScore: number;
  cedantId: string;
  cedant?: { id: string; name: string; type: string };
  submittedById: string;
  submittedBy?: { id: string; firstName: string; lastName: string; email: string };
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubmissionDto {
  title: string;
  type: 'treaty' | 'facultative';
  lineOfBusiness: string;
  description?: string;
  sumInsured?: number;
  currency?: string;
  inceptionDate?: string;
  expiryDate?: string;
  cedantId: string;
  riskDetails?: any;
  lossHistory?: any;
}

export interface PaginatedSubmissions {
  data: Submission[];
  total: number;
  page: number;
  limit: number;
}

export const useSubmissions = (filters?: Record<string, any>) =>
  useQuery({
    queryKey: ['submissions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const res = await api.get<PaginatedSubmissions>(`/submissions?${params.toString()}`);
      return res.data;
    },
  });

export const useSubmission = (id: string) =>
  useQuery({
    queryKey: ['submission', id],
    queryFn: async () => {
      const res = await api.get<Submission>(`/submissions/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

export const useCreateSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSubmissionDto) => {
      const res = await api.post<Submission>('/submissions', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

export const useUpdateSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateSubmissionDto> }) => {
      const res = await api.patch<Submission>(`/submissions/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

export const useSubmitSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<Submission>(`/submissions/${id}/submit`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['submission', id] });
      queryClient.invalidateQueries({ queryKey: ['submission-history', id] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

export const useUpdateStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch<Submission>(`/submissions/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['submission-history', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

export const useCalculateScore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/submissions/${id}/calculate-score`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['submission', id] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

export const useDeleteSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/submissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

export const useSubmissionHistory = (id: string) =>
  useQuery({
    queryKey: ['submission-history', id],
    queryFn: async () => {
      const res = await api.get(`/submissions/${id}/history`);
      return res.data;
    },
    enabled: !!id,
  });
