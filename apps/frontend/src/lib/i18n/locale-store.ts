import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, isLocale, Locale } from './dictionaries';

const STORAGE_KEY = 'locale-storage';

interface LocaleState {
  locale: Locale;
  /** False until the persisted (or browser-guessed) locale has been applied. */
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      hydrated: false,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ locale: state.locale }),
      /**
       * Hydration is driven manually from `I18nProvider` so the first client
       * render matches the server-rendered HTML (which is always DEFAULT_LOCALE);
       * the stored locale is applied in an effect immediately afterwards.
       */
      skipHydration: true,
    },
  ),
);

/** Reads the persisted locale without touching the store. Null on a first visit. */
function readPersistedLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { locale?: unknown } };
    return isLocale(parsed?.state?.locale) ? parsed.state.locale : null;
  } catch {
    // Corrupt entry or storage disabled (private mode): treat as a first visit.
    return null;
  }
}

/**
 * Best-effort guess from the browser's language preferences, used only when
 * nothing has been persisted yet. Falls back to English.
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const candidates = [...(navigator.languages ?? []), navigator.language];
  for (const candidate of candidates) {
    const base = candidate?.split('-')[0]?.toLowerCase();
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/**
 * Restores the persisted locale, or picks one from the browser on a first
 * visit. Safe to call more than once — later calls are no-ops.
 */
export async function hydrateLocale(): Promise<void> {
  if (useLocaleStore.getState().hydrated) return;

  const persisted = readPersistedLocale();
  await Promise.resolve(useLocaleStore.persist.rehydrate());

  // Persisting the detected locale means the guess only ever happens once.
  useLocaleStore.setState({
    locale: persisted ?? detectBrowserLocale(),
    hydrated: true,
  });
}
