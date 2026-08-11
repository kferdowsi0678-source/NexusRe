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
  completenessScore: number;
  cedantId: string;
  submittedById: string;
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

export const useSubmissions = (filters?: any) => {
  return useQuery({
    queryKey: ['submissions', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/submissions?${params}`);
      return response.data;
    },
  });
};

export const useSubmission = (id: string) => {
  return useQuery({
    queryKey: ['submission', id],
    queryFn: async () => {
      const response = await api.get(`/submissions/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubmissionDto) => {
      const response = await api.post('/submissions', data);
      return response.data;
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
      const response = await api.patch(`/submissions/${id}`, data);
      return response.data;
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
      const response = await api.post(`/submissions/${id}/submit`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['submission', id] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};

export const useSubmissionHistory = (id: string) => {
  return useQuery({
    queryKey: ['submission-history', id],
    queryFn: async () => {
      const response = await api.get(`/submissions/${id}/history`);
      return response.data;
    },
    enabled: !!id,
  });
};
