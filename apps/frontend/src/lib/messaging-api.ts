import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export interface ThreadSummary {
  id: string;
  submissionId: string;
  subject?: string;
  lastMessageAt?: string;
  cedantOrg?: { id: string; name: string };
  counterpartyOrg?: { id: string; name: string };
}

export interface ThreadDetail {
  id: string;
  submissionId: string;
  subject?: string;
  cedantOrg: { id: string; name?: string };
  counterpartyOrg: { id: string; name?: string };
  messages: {
    id: string;
    body: string;
    createdAt: string;
    senderName: string;
    senderOrgId: string;
    senderOrgName?: string;
    mine: boolean;
  }[];
}

export const useThreads = (submissionId: string) =>
  useQuery({
    queryKey: ['threads', submissionId],
    queryFn: async () => {
      const res = await api.get<ThreadSummary[]>(`/submissions/${submissionId}/threads`);
      return res.data;
    },
    enabled: !!submissionId,
  });

export const useThread = (threadId?: string) =>
  useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const res = await api.get<ThreadDetail>(`/threads/${threadId}`);
      return res.data;
    },
    enabled: !!threadId,
  });

export const useOpenThread = (submissionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { counterpartyOrgId: string; subject?: string }) => {
      const res = await api.post<ThreadSummary>(
        `/submissions/${submissionId}/threads`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads', submissionId] });
    },
  });
};

export const usePostMessage = (submissionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { threadId: string; body: string }) => {
      const res = await api.post(`/threads/${payload.threadId}/messages`, {
        body: payload.body,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['thread', variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['threads', submissionId] });
    },
  });
};
