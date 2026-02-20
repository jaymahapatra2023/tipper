'use client';

import { Sidebar } from '@/components/shared/sidebar';

const staffNav = [
  { label: 'Dashboard', href: '/staff-dashboard' },
  { label: 'My Tips', href: '/staff-tips' },
  { label: 'Assignments', href: '/staff-assignments' },
  { label: 'Payouts', href: '/staff-payouts' },
  { label: 'Settings', href: '/staff-settings' },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar items={staffNav} title="Staff Portal" />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
