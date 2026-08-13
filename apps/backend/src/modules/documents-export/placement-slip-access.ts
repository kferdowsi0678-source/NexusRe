import { RoleType } from '../users/entities/role.entity';

/** Just the submission facts that bear on who may read the slip. */
export interface SlipAccessSubject {
  cedantId?: string | null;
  submittedById?: string | null;
  quotes?: Array<{ reinsurerId?: string | null }> | null;
}

export interface SlipViewer {
  userId?: string | null;
  organizationId?: string | null;
  roles?: string[] | null;
}

export type SlipAccess =
  /** Sees the whole slip, every quote included. */
  | { kind: 'full' }
  /** An invited market: sees the slip, but only its own quotes. */
  | { kind: 'own_quotes_only'; organizationId: string }
  | { kind: 'denied' };

/**
 * Decides what a viewer may see in a placement slip.
 *
 * The slip aggregates every quote on a submission — rate, premium and capacity
 * for each market. That is exactly the data a competing reinsurer must never
 * see, so a market gets the slip with its own quotes only, mirroring how the
 * analytics and quotes modules already restrict cross-market visibility.
 */
export function resolveSlipAccess(
  submission: SlipAccessSubject,
  viewer: SlipViewer,
): SlipAccess {
  const roles = viewer.roles ?? [];

  if (roles.includes(RoleType.SUPER_ADMIN)) {
    return { kind: 'full' };
  }

  const organizationId = viewer.organizationId ?? null;

  // The ceding side: the cedant organization, or whoever raised the submission
  // (a broker acting for the cedant).
  const isCedantOrg = !!organizationId && submission.cedantId === organizationId;
  const isAuthor = !!viewer.userId && submission.submittedById === viewer.userId;
  if (isCedantOrg || isAuthor) {
    return { kind: 'full' };
  }

  // A market that has actually quoted is involved enough to take the slip away
  // with it, but only with its own terms on it.
  const hasQuoted =
    !!organizationId &&
    (submission.quotes ?? []).some((quote) => quote?.reinsurerId === organizationId);
  if (hasQuoted) {
    return { kind: 'own_quotes_only', organizationId };
  }

  return { kind: 'denied' };
}

/** Narrows a submission's quotes to what the resolved access permits. */
export function applySlipAccess<T extends { reinsurerId?: string | null }>(
  quotes: T[] | null | undefined,
  access: SlipAccess,
): T[] {
  if (access.kind === 'denied') return [];
  if (access.kind === 'full') return quotes ?? [];
  return (quotes ?? []).filter((quote) => quote?.reinsurerId === access.organizationId);
}
