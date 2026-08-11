'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useLogout } from '@/lib/auth-api';
import { NotificationBell } from './notification-bell';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', roles: ['all'] },
  { name: 'Submissions', href: '/submissions', roles: ['all'] },
  { name: 'Organizations', href: '/organizations', roles: ['super_admin', 'org_admin'] },
  { name: 'Users', href: '/users', roles: ['super_admin', 'org_admin'] },
  { name: 'Opportunities', href: '/opportunities', roles: ['reinsurer_underwriter', 'reinsurer_admin'] },
  { name: 'Appetite', href: '/appetite', roles: ['reinsurer_underwriter', 'reinsurer_admin'] },
  { name: 'Forms', href: '/forms', roles: ['super_admin'] },
  { name: 'Profile', href: '/profile', roles: ['all'] },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const logout = useLogout();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      router.push('/login');
    } catch (error) {
      clearAuth();
      router.push('/login');
    }
  };

  const userRoles = user?.roles?.map(r => r.name) || [];
  
  const filteredNav = navigation.filter(item => 
    item.roles.includes('all') || 
    item.roles.some(role => userRoles.includes(role))
  );

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
                NexusRe
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {filteredNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex-shrink-0">
              <span className="text-sm text-gray-700">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                ({user?.roles?.[0]?.name?.replace(/_/g, ' ')})
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}