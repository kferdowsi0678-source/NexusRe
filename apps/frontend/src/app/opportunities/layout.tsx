import { AppShell } from '@/components/app-shell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell allowedRoles={['reinsurer_underwriter', 'reinsurer_admin']}>{children}</AppShell>
  );
}
