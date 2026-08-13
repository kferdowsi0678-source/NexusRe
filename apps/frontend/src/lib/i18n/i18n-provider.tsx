'use client';

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import {
  DateInput,
  formatCurrency as formatCurrencyFor,
  formatDate as formatDateFor,
  formatDateTime as formatDateTimeFor,
  formatNumber as formatNumberFor,
} from './format';
import {
  EnumNamespace,
  INTL_LOCALES,
  Locale,
  TranslationKey,
  TranslationVars,
  translate,
  translateEnum,
} from './dictionaries';
import { hydrateLocale, useLocaleStore } from './locale-store';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** True once the persisted locale has been restored on the client. */
  isHydrated: boolean;
  /** `t('auth.login.submit')`, `t('dashboard.greeting', { name })`. */
  t: (key: TranslationKey, vars?: TranslationVars) => string;
  /** `tEnum('status', submission.status)` for codes coming from the API. */
  tEnum: (namespace: EnumNamespace, code: string | null | undefined) => string;
  formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (
    value: number | string | null | undefined,
    currency: string | null | undefined,
    options?: Intl.NumberFormatOptions,
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const isHydrated = useLocaleStore((state) => state.hydrated);

  // Deferred to an effect so the first client render matches the server HTML.
  useEffect(() => {
    void hydrateLocale();
  }, []);

  // `<html lang>` is rendered statically by the root layout; keep it in sync so
  // screen readers and browser translation prompts follow the chosen locale.
  useEffect(() => {
    document.documentElement.lang = INTL_LOCALES[locale];
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, vars?: TranslationVars) => translate(locale, key, vars),
    [locale],
  );

  const tEnum = useCallback(
    (namespace: EnumNamespace, code: string | null | undefined) =>
      translateEnum(locale, namespace, code),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      isHydrated,
      t,
      tEnum,
      formatDate: (input, options) => formatDateFor(locale, input, options),
      formatDateTime: (input, options) => formatDateTimeFor(locale, input, options),
      formatNumber: (input, options) => formatNumberFor(locale, input, options),
      formatCurrency: (input, currency, options) =>
        formatCurrencyFor(locale, input, currency, options),
    }),
    [locale, setLocale, isHydrated, t, tEnum],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Access to translations and locale-bound formatters.
 * Must be called beneath `<I18nProvider>` (mounted in `app/providers.tsx`).
 */
export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an <I18nProvider>');
  }
  return context;
}
