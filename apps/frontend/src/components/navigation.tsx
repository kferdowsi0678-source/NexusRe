'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useLogout } from '@/lib/auth-api';
import { NotificationBell } from './notification-bell';

const REINSURER = ['reinsurer_underwriter', 'reinsurer_admin'];
const ORG_ADMIN = ['super_admin', 'org_admin'];

/** roles: ['all'] means every signed-in user sees the link. */
const navigation = [
  { name: 'Dashboard', href: '/dashboard', roles: ['all'] },
  { name: 'Submissions', href: '/submissions', roles: ['all'] },
  { name: 'Opportunities', href: '/opportunities', roles: REINSURER },
  { name: 'Appetite', href: '/appetite', roles: REINSURER },
  { name: 'Organizations', href: '/organizations', roles: ORG_ADMIN },
  { name: 'Users', href: '/users', roles: ORG_ADMIN },
  { name: 'Audit', href: '/audit', roles: ['super_admin'] },
  { name: 'Forms', href: '/forms', roles: ['super_admin'] },
  { name: 'Profile', href: '/profile', roles: ['all'] },
];

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const logout = useLogout();

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
                NexusRe
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
              {visible.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className={cx(
                    'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium',
                    pathname === item.href
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <p className="text-sm text-gray-700">
                {user?.firstName} {user?.lastName}
              </p>
              {userRoles[0] && (
                <p className="text-xs capitalize text-gray-500">
                  {userRoles[0].replace(/_/g, ' ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {logout.isPending ? 'Signing out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
