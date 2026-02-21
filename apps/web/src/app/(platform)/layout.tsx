'use client';

import { Sidebar } from '@/components/shared/sidebar';

const platformNav = [
  { label: 'Hotels', href: '/platform-hotels' },
  { label: 'Analytics', href: '/platform-analytics' },
  { label: 'Payouts', href: '/platform-payouts' },
  { label: 'Settings', href: '/platform-settings' },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar items={platformNav} title="Platform Admin" />
      <main className="flex-1 overflow-auto bg-surface bg-dot-pattern p-8">{children}</main>
    </div>
  );
}
