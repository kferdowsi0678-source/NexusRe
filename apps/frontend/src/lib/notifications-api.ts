import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: { submissionId?: string; quoteId?: string; threadId?: string };
  isRead: boolean;
  createdAt: string;
}

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<NotificationRecord[]>('/notifications');
      return res.data;
    },
  });

/** Polled, because there is no websocket transport yet. */
export const useUnreadCount = () =>
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      return res.data.count;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
