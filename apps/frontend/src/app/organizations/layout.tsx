import { AppShell } from '@/components/app-shell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell allowedRoles={['super_admin', 'org_admin']}>{children}</AppShell>;
}
