import { RoleType } from '../users/entities/role.entity';
import {
  SlipAccessSubject,
  SlipViewer,
  applySlipAccess,
  resolveSlipAccess,
} from './placement-slip-access';

const CEDANT_ORG = 'org-cedant';
const MARKET_A = 'org-market-a';
const MARKET_B = 'org-market-b';
const OUTSIDER_ORG = 'org-outsider';
const AUTHOR = 'user-author';

function submission(overrides: Partial<SlipAccessSubject> = {}): SlipAccessSubject {
  return {
    cedantId: CEDANT_ORG,
    submittedById: AUTHOR,
    quotes: [{ reinsurerId: MARKET_A }, { reinsurerId: MARKET_B }],
    ...overrides,
  };
}

function viewer(overrides: Partial<SlipViewer> = {}): SlipViewer {
  return { userId: 'user-x', organizationId: OUTSIDER_ORG, roles: [], ...overrides };
}

describe('resolveSlipAccess', () => {
  it('gives a super admin the whole slip', () => {
    const access = resolveSlipAccess(
      submission(),
      viewer({ roles: [RoleType.SUPER_ADMIN] }),
    );

    expect(access.kind).toBe('full');
  });

  it('gives the cedant organization the whole slip', () => {
    const access = resolveSlipAccess(
      submission(),
      viewer({ organizationId: CEDANT_ORG, roles: [RoleType.CEDANT_USER] }),
    );

    expect(access.kind).toBe('full');
  });

  it('gives the broker who raised it the whole slip', () => {
    const access = resolveSlipAccess(
      submission(),
      viewer({ userId: AUTHOR, organizationId: 'org-broker', roles: [RoleType.BROKER_USER] }),
    );

    expect(access.kind).toBe('full');
  });

  it('limits a market that has quoted to its own quotes', () => {
    const access = resolveSlipAccess(
      submission(),
      viewer({ organizationId: MARKET_A, roles: [RoleType.REINSURER_UNDERWRITER] }),
    );

    expect(access).toEqual({ kind: 'own_quotes_only', organizationId: MARKET_A });
  });

  it('denies a reinsurer that has not quoted', () => {
    const access = resolveSlipAccess(
      submission(),
      viewer({ organizationId: OUTSIDER_ORG, roles: [RoleType.REINSURER_UNDERWRITER] }),
    );

    expect(access.kind).toBe('denied');
  });

  it('denies an unrelated cedant', () => {
    const access = resolveSlipAccess(
      submission(),
      viewer({ organizationId: 'org-other-cedant', roles: [RoleType.CEDANT_USER] }),
    );

    expect(access.kind).toBe('denied');
  });

  it('denies a viewer with no organization rather than matching a null cedantId', () => {
    const access = resolveSlipAccess(
      submission({ cedantId: null, submittedById: null }),
      viewer({ userId: null, organizationId: null }),
    );

    expect(access.kind).toBe('denied');
  });

  it('denies when the submission has no quotes and the viewer is a market', () => {
    const access = resolveSlipAccess(
      submission({ quotes: [] }),
      viewer({ organizationId: MARKET_A, roles: [RoleType.REINSURER_UNDERWRITER] }),
    );

    expect(access.kind).toBe('denied');
  });
});

describe('applySlipAccess', () => {
  const quotes = [
    { reinsurerId: MARKET_A, premium: 100 },
    { reinsurerId: MARKET_B, premium: 200 },
  ];

  it('returns every quote for full access', () => {
    expect(applySlipAccess(quotes, { kind: 'full' })).toHaveLength(2);
  });

  it('returns only the viewer\'s own quotes for a market', () => {
    const visible = applySlipAccess(quotes, {
      kind: 'own_quotes_only',
      organizationId: MARKET_A,
    });

    expect(visible).toEqual([{ reinsurerId: MARKET_A, premium: 100 }]);
  });

  it('never leaks a competitor premium to a market', () => {
    const visible = applySlipAccess(quotes, {
      kind: 'own_quotes_only',
      organizationId: MARKET_A,
    });

    expect(visible.some((q) => q.reinsurerId === MARKET_B)).toBe(false);
  });

  it('returns nothing when access was denied', () => {
    expect(applySlipAccess(quotes, { kind: 'denied' })).toEqual([]);
  });

  it('tolerates a submission with no quotes loaded', () => {
    expect(applySlipAccess(null, { kind: 'full' })).toEqual([]);
    expect(applySlipAccess(undefined, { kind: 'full' })).toEqual([]);
  });
});
