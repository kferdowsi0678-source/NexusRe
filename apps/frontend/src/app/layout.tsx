import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
// Imported from the dictionary module directly (not the barrel) so this server
// component does not pull the client-only provider into its module graph.
import { DEFAULT_LOCALE, INTL_LOCALES } from '@/lib/i18n/dictionaries';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NexusRe - Digital Reinsurance Placement Platform',
  description: 'B2B SaaS platform for Non-Life reinsurance placement',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The locale lives in localStorage, so the server always renders the default
    // (`en-GB`); `I18nProvider` rewrites `document.documentElement.lang` on the
    // client once the persisted locale is restored. `suppressHydrationWarning`
    // keeps React quiet about that one attribute.
    <html lang={INTL_LOCALES[DEFAULT_LOCALE]} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
