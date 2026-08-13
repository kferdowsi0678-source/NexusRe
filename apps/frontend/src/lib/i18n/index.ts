/**
 * Lightweight in-app i18n (English + French), no external dependency.
 *
 * Adding a translated string:
 *   1. Add the key to `en.ts` (nested under the surface it belongs to).
 *   2. `npx tsc --noEmit` now fails on `fr.ts` — add the French copy there.
 *   3. In a client component: `const { t } = useTranslation()` then
 *      `t('auth.login.submit')`, or `t('dashboard.greeting', { name })` when the
 *      string contains a `{placeholder}`.
 *   4. For codes returned by the API (statuses, lines of business, roles) add
 *      them to the matching enum namespace and render with
 *      `tEnum('status', submission.status)`.
 */
export { I18nProvider, useTranslation } from './i18n-provider';
export type { I18nContextValue } from './i18n-provider';

export {
  DEFAULT_LOCALE,
  INTL_LOCALES,
  LOCALES,
  LOCALE_NAMES,
  LOCALE_SHORT_NAMES,
  dictionaries,
  interpolate,
  isLocale,
  translate,
  translateEnum,
} from './dictionaries';
export type {
  Dictionary,
  EnumNamespace,
  Locale,
  TranslationKey,
  TranslationVars,
} from './dictionaries';

export { detectBrowserLocale, useLocaleStore } from './locale-store';

export { formatCurrency, formatDate, formatDateTime, formatNumber } from './format';
export type { DateInput } from './format';
