import { en } from './en';
import { fr } from './fr';

export const LOCALES = ['en', 'fr'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** English is the source of truth; every other locale is typed as `typeof en`. */
export type Dictionary = typeof en;

export const dictionaries: Record<Locale, Dictionary> = { en, fr };

/** Names are shown in their own language — they are intentionally not translated. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};

/** Compact labels for the header switcher. */
export const LOCALE_SHORT_NAMES: Record<Locale, string> = {
  en: 'EN',
  fr: 'FR',
};

/**
 * BCP 47 tags used for `Intl` formatting and the `<html lang>` attribute.
 * `en-GB` rather than `en-US`: the platform's English-speaking markets (Nigeria,
 * Kenya, Ghana, South Africa) use day-first dates and metric grouping, which
 * also keeps English and French output visually consistent.
 */
export const INTL_LOCALES: Record<Locale, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
};

/** Every dot-separated path to a string leaf, e.g. `'auth.login.submit'`. */
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DotPaths<Dictionary>;

/** Values substituted into `{placeholder}` tokens. */
export type TranslationVars = Record<string, string | number>;

/**
 * Namespaces keyed by an API code (status, role, ...) rather than by a fixed
 * key, looked up at runtime through `tEnum()`.
 */
export type EnumNamespace =
  | 'status'
  | 'quoteStatus'
  | 'quoteType'
  | 'submissionType'
  | 'lineOfBusiness'
  | 'organizationType'
  | 'role';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

const PLACEHOLDER = /\{(\w+)\}/g;

/** Replaces `{name}` tokens; unknown tokens are left untouched so they surface in review. */
export function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : token,
  );
}

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: unknown = dictionary;
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Resolves a key for a locale. Types guarantee the key exists, so the English
 * fallback only ever fires if a dictionary is mutated at runtime.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: TranslationVars,
): string {
  const template = lookup(dictionaries[locale], key) ?? lookup(dictionaries.en, key) ?? key;
  return interpolate(template, vars);
}

/** `under_review` -> `Under review`, used when the API sends a code we don't know yet. */
function humanize(code: string): string {
  const spaced = code.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Translates a dynamic code coming from the API (a status, a line of business,
 * a role). Unknown codes degrade to a humanized version of the code rather than
 * rendering an empty cell.
 */
export function translateEnum(
  locale: Locale,
  namespace: EnumNamespace,
  code: string | null | undefined,
): string {
  if (!code) return '';
  const group = dictionaries[locale][namespace] as Record<string, string | undefined>;
  const fallbackGroup = dictionaries.en[namespace] as Record<string, string | undefined>;
  return group[code] ?? fallbackGroup[code] ?? humanize(code);
}

export { en, fr };
