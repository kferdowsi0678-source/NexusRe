'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useLogout } from '@/lib/auth-api';
import { TranslationKey, useTranslation } from '@/lib/i18n';
import { NotificationBell } from './notification-bell';
import { LanguageSwitcher } from './language-switcher';

const REINSURER = ['reinsurer_underwriter', 'reinsurer_admin'];
const ORG_ADMIN = ['super_admin', 'org_admin'];

/** roles: ['all'] means every signed-in user sees the link. */
const navigation: { labelKey: TranslationKey; href: string; roles: string[] }[] = [
  { labelKey: 'nav.dashboard', href: '/dashboard', roles: ['all'] },
  { labelKey: 'nav.submissions', href: '/submissions', roles: ['all'] },
  { labelKey: 'nav.opportunities', href: '/opportunities', roles: REINSURER },
  { labelKey: 'nav.appetite', href: '/appetite', roles: REINSURER },
  { labelKey: 'nav.organizations', href: '/organizations', roles: ORG_ADMIN },
  { labelKey: 'nav.users', href: '/users', roles: ORG_ADMIN },
  { labelKey: 'nav.audit', href: '/audit', roles: ['super_admin'] },
  { labelKey: 'nav.forms', href: '/forms', roles: ['super_admin'] },
  { labelKey: 'nav.profile', href: '/profile', roles: ['all'] },
];

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const logout = useLogout();
  const { t, tEnum } = useTranslation();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // Server-side revocation failed; drop local credentials regardless.
      clearAuth();
    } finally {
      router.push('/login');
    }
  };

  const userRoles: string[] = (user?.roles ?? []).map((r: any) =>
    typeof r === 'string' ? r : r.name,
  );

  const visible = navigation.filter(
    (item) => item.roles.includes('all') || item.roles.some((role) => userRoles.includes(role)),
  );

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
                {t('common.appName')}
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
              {visible.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className={cx(
                    'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium',
                    pathname === item.href
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <p className="text-sm text-gray-700">
                {user?.firstName} {user?.lastName}
              </p>
              {userRoles[0] && (
                <p className="text-xs text-gray-500">{tEnum('role', userRoles[0])}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {logout.isPending ? t('nav.loggingOut') : t('nav.logout')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
