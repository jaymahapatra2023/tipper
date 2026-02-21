'use client';

import {
  LayoutDashboard,
  Users,
  DoorOpen,
  QrCode,
  BarChart3,
  Shield,
  Settings,
} from 'lucide-react';
import { Sidebar } from '@/components/shared/sidebar';

const adminNav = [
  { label: 'Dashboard', href: '/admin-dashboard', icon: LayoutDashboard },
  { label: 'Staff', href: '/admin-staff', icon: Users },
  { label: 'Rooms', href: '/admin-rooms', icon: DoorOpen },
  { label: 'QR Codes', href: '/admin-qr-codes', icon: QrCode },
  { label: 'Analytics', href: '/admin-analytics', icon: BarChart3 },
  { label: 'Audit Log', href: '/admin-audit-log', icon: Shield },
  { label: 'Settings', href: '/admin-settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar items={adminNav} title="Hotel Admin" />
      <main className="flex-1 overflow-auto bg-surface bg-dot-pattern p-8">{children}</main>
    </div>
  );
}
