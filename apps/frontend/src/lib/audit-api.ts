import { useQuery } from '@tanstack/react-query';
import api from './api';

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId: string | null;
  before: any;
  after: any;
  ipAddress: string | null;
  createdAt: string;
}

export const useAuditLogs = (filters: {
  resourceType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, String(value));
  });

  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const res = await api.get<AuditLogEntry[]>(`/audit?${params.toString()}`);
      return res.data;
    },
    enabled: false,
    retry: false,
  });
};
