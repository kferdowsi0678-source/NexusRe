import { QuoteStatus } from '../submissions/entities/quote.entity';

/** Which side of the placement the acting user sits on. */
export type QuoteActor = 'reinsurer' | 'cedant';

interface Transition {
  to: QuoteStatus;
  by: QuoteActor[];
}

/**
 * Firming an offer is the reinsurer's call; accepting one is the cedant's.
 * Either side may walk away. Terminal states have no exits.
 */
const RULES: Record<QuoteStatus, Transition[]> = {
  [QuoteStatus.INDICATION]: [
    { to: QuoteStatus.FIRM_OFFER, by: ['reinsurer'] },
    { to: QuoteStatus.DECLINED, by: ['reinsurer', 'cedant'] },
    { to: QuoteStatus.EXPIRED, by: ['reinsurer'] },
  ],
  [QuoteStatus.FIRM_OFFER]: [
    { to: QuoteStatus.ACCEPTED, by: ['cedant'] },
    { to: QuoteStatus.DECLINED, by: ['reinsurer', 'cedant'] },
    { to: QuoteStatus.EXPIRED, by: ['reinsurer'] },
  ],
  [QuoteStatus.ACCEPTED]: [],
  [QuoteStatus.DECLINED]: [],
  [QuoteStatus.EXPIRED]: [],
};

export function allowedQuoteTransitions(from: QuoteStatus, actor: QuoteActor): QuoteStatus[] {
  return (RULES[from] ?? []).filter((t) => t.by.includes(actor)).map((t) => t.to);
}

export function quoteTransitionAllowed(
  from: QuoteStatus,
  to: QuoteStatus,
  actor: QuoteActor,
): boolean {
  return allowedQuoteTransitions(from, actor).includes(to);
}

export function isTerminalQuoteStatus(status: QuoteStatus): boolean {
  return (RULES[status] ?? []).length === 0;
}
