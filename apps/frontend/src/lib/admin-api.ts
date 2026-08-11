import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';

export interface OrganizationRecord {
  id: string;
  name: string;
  type: 'cedant' | 'broker' | 'reinsurer' | 'admin';
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  users?: any[];
  createdAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  organization?: { id: string; name: string };
  roles?: { id: string; name: string }[];
}

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
}

// Organizations
export const useOrganizations = () =>
  useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await api.get<OrganizationRecord[]>('/organizations');
      return res.data;
    },
  });

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<OrganizationRecord>) => {
      const res = await api.post<OrganizationRecord>('/organizations', data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OrganizationRecord> }) => {
      const res = await api.patch<OrganizationRecord>(`/organizations/${id}`, data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
};

// Users
export const useUsers = () =>
  useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<UserRecord[]>('/users');
      return res.data;
    },
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationId: string;
      roleIds?: string[];
    }) => {
      const res = await api.post<UserRecord>('/users', data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await api.patch<UserRecord>(`/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

// Roles are exposed publicly (super_admin filtered server-side)
export const useRoles = () =>
  useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get<RoleRecord[]>('/public/roles');
      return res.data;
    },
  });
