'use client';

import { LOCALES, LOCALE_NAMES, LOCALE_SHORT_NAMES, useTranslation } from '@/lib/i18n';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/**
 * Compact EN / FR segmented control. Sized to sit inline with the header
 * controls (notification bell, logout) without adding visual weight.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className={cx(
        'inline-flex items-center rounded-md border border-gray-300 bg-white p-0.5',
        className,
      )}
    >
      {LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            onClick={() => setLocale(option)}
            aria-pressed={active}
            title={LOCALE_NAMES[option]}
            className={cx(
              'rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500',
              active
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
            )}
          >
            <span aria-hidden="true">{LOCALE_SHORT_NAMES[option]}</span>
            <span className="sr-only">{LOCALE_NAMES[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
