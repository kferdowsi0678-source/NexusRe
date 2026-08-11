import { QuoteStatus } from '../submissions/entities/quote.entity';
import {
  allowedQuoteTransitions,
  isTerminalQuoteStatus,
  quoteTransitionAllowed,
} from './quote-transitions';

describe('quote transitions', () => {
  it('lets the reinsurer firm up an indication, but not the cedant', () => {
    expect(quoteTransitionAllowed(QuoteStatus.INDICATION, QuoteStatus.FIRM_OFFER, 'reinsurer')).toBe(
      true,
    );
    expect(quoteTransitionAllowed(QuoteStatus.INDICATION, QuoteStatus.FIRM_OFFER, 'cedant')).toBe(
      false,
    );
  });

  it('reserves acceptance for the cedant', () => {
    expect(quoteTransitionAllowed(QuoteStatus.FIRM_OFFER, QuoteStatus.ACCEPTED, 'cedant')).toBe(true);
    expect(quoteTransitionAllowed(QuoteStatus.FIRM_OFFER, QuoteStatus.ACCEPTED, 'reinsurer')).toBe(
      false,
    );
  });

  it('will not accept straight off an indication', () => {
    expect(quoteTransitionAllowed(QuoteStatus.INDICATION, QuoteStatus.ACCEPTED, 'cedant')).toBe(
      false,
    );
  });

  it('lets either side decline', () => {
    for (const actor of ['cedant', 'reinsurer'] as const) {
      expect(quoteTransitionAllowed(QuoteStatus.INDICATION, QuoteStatus.DECLINED, actor)).toBe(true);
      expect(quoteTransitionAllowed(QuoteStatus.FIRM_OFFER, QuoteStatus.DECLINED, actor)).toBe(true);
    }
  });

  it('treats accepted, declined and expired as terminal', () => {
    for (const status of [QuoteStatus.ACCEPTED, QuoteStatus.DECLINED, QuoteStatus.EXPIRED]) {
      expect(isTerminalQuoteStatus(status)).toBe(true);
      expect(allowedQuoteTransitions(status, 'cedant')).toEqual([]);
      expect(allowedQuoteTransitions(status, 'reinsurer')).toEqual([]);
    }
  });

  it('reports what each side may do next', () => {
    expect(allowedQuoteTransitions(QuoteStatus.INDICATION, 'reinsurer')).toEqual([
      QuoteStatus.FIRM_OFFER,
      QuoteStatus.DECLINED,
      QuoteStatus.EXPIRED,
    ]);
    expect(allowedQuoteTransitions(QuoteStatus.INDICATION, 'cedant')).toEqual([
      QuoteStatus.DECLINED,
    ]);
  });
});
