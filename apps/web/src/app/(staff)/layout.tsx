'use client';

import { LayoutDashboard, Receipt, ClipboardList, Wallet, Settings } from 'lucide-react';
import { Sidebar } from '@/components/shared/sidebar';

const staffNav = [
  { label: 'Dashboard', href: '/staff-dashboard', icon: LayoutDashboard },
  { label: 'My Tips', href: '/staff-tips', icon: Receipt },
  { label: 'Assignments', href: '/staff-assignments', icon: ClipboardList },
  { label: 'Payouts', href: '/staff-payouts', icon: Wallet },
  { label: 'Settings', href: '/staff-settings', icon: Settings },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar items={staffNav} title="Staff Portal" />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
