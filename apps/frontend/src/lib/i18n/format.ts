import { INTL_LOCALES, Locale } from './dictionaries';

export type DateInput = Date | string | number | null | undefined;

/**
 * `Intl.*Format` construction is not free and these run inside table rows, so
 * formatters are memoized per locale + options.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat>(
  key: string,
  build: () => T,
): T {
  const hit = formatterCache.get(key);
  if (hit) return hit as T;
  const formatter = build();
  formatterCache.set(key, formatter);
  return formatter;
}

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const DEFAULT_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DEFAULT_DATE_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
};

/** Formats a date in the active locale. Invalid or missing input yields ''. */
export function formatDate(
  locale: Locale,
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  const date = toDate(value);
  if (!date) return '';
  const key = `d:${locale}:${JSON.stringify(options)}`;
  return cached(key, () => new Intl.DateTimeFormat(INTL_LOCALES[locale], options)).format(date);
}

/** Formats a date with time in the active locale. */
export function formatDateTime(
  locale: Locale,
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_TIME_OPTIONS,
): string {
  return formatDate(locale, value, options);
}

/** Formats a number in the active locale. Non-numeric input yields ''. */
export function formatNumber(
  locale: Locale,
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (numeric === null || numeric === undefined || !Number.isFinite(numeric)) return '';
  const key = `n:${locale}:${JSON.stringify(options)}`;
  return cached(key, () => new Intl.NumberFormat(INTL_LOCALES[locale], options)).format(numeric);
}

/**
 * Formats a monetary amount in the active locale. Currency codes come from the
 * API (USD, EUR, NGN, XOF, ...); an unrecognised code falls back to plain
 * number formatting with the code appended so the figure is never lost.
 */
export function formatCurrency(
  locale: Locale,
  value: number | string | null | undefined,
  currency: string | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (numeric === null || numeric === undefined || !Number.isFinite(numeric)) return '';
  if (!currency) return formatNumber(locale, numeric, options);

  try {
    return formatNumber(locale, numeric, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      ...options,
    });
  } catch {
    const amount = formatNumber(locale, numeric, { maximumFractionDigits: 2, ...options });
    return `${amount} ${currency}`;
  }
}
