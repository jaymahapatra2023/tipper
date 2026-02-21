'use client';

import { LayoutDashboard, Receipt, ClipboardList, Wallet, Settings, BarChart3 } from 'lucide-react';
import { Sidebar } from '@/components/shared/sidebar';

const staffNav = [
  { label: 'Dashboard', href: '/staff-dashboard', icon: LayoutDashboard },
  { label: 'Performance', href: '/staff-performance', icon: BarChart3 },
  { label: 'My Tips', href: '/staff-tips', icon: Receipt },
  { label: 'Assignments', href: '/staff-assignments', icon: ClipboardList },
  { label: 'Payouts', href: '/staff-payouts', icon: Wallet },
  { label: 'Settings', href: '/staff-settings', icon: Settings },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar items={staffNav} title="Staff Portal">
        {children}
      </Sidebar>
    </div>
  );
}
