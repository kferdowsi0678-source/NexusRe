import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export interface EmailPreferences {
  id: string;
  userId: string;
  quoteReceived: boolean;
  quoteStatusChanged: boolean;
  messageReceived: boolean;
  submissionStatusChanged: boolean;
  weeklyDigest: boolean;
}

export type EmailPreferenceKey =
  | 'quoteReceived'
  | 'quoteStatusChanged'
  | 'messageReceived'
  | 'submissionStatusChanged'
  | 'weeklyDigest';

export const EMAIL_PREFERENCE_LABELS: { key: EmailPreferenceKey; label: string }[] = [
  { key: 'quoteReceived', label: 'A quote arrives on my submission' },
  { key: 'quoteStatusChanged', label: 'A quote is firmed up, accepted or declined' },
  { key: 'messageReceived', label: 'Someone messages me about a submission' },
  { key: 'submissionStatusChanged', label: 'My submission changes status' },
  { key: 'weeklyDigest', label: 'Weekly summary of activity' },
];

export const useEmailPreferences = () =>
  useQuery({
    queryKey: ['email-preferences'],
    queryFn: async () => {
      const res = await api.get<EmailPreferences>('/users/me/email-preferences');
      return res.data;
    },
  });

export const useUpdateEmailPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Record<EmailPreferenceKey, boolean>>) => {
      const res = await api.patch<EmailPreferences>('/users/me/email-preferences', patch);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['email-preferences'], data);
    },
  });
};
