'use client';

import { useMemo } from 'react';
import { useAuthStore } from './auth-store';

const REINSURER_ROLES = ['reinsurer_underwriter', 'reinsurer_admin'];
const CEDANT_ROLES = ['cedant_user', 'broker_user'];

/**
 * Convenience view of the signed-in user's roles. Presentation only — every
 * one of these checks is enforced again on the server.
 */
export function useRoleFlags() {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    const roles: string[] = (user?.roles ?? []).map((r: any) =>
      typeof r === 'string' ? r : r.name,
    );
    const isAdmin = roles.includes('super_admin');
    return {
      roles,
      isAdmin,
      isOrgAdmin: roles.includes('org_admin'),
      isReinsurer: roles.some((r) => REINSURER_ROLES.includes(r)),
      isCedantSide: roles.some((r) => CEDANT_ROLES.includes(r)) || isAdmin,
      organizationId: user?.organizationId ?? null,
      userId: user?.id ?? null,
    };
  }, [user]);
}
