'use client';

import { Sidebar } from '@/components/shared/sidebar';

const adminNav = [
  { label: 'Dashboard', href: '/admin-dashboard' },
  { label: 'Staff', href: '/admin-staff' },
  { label: 'Rooms', href: '/admin-rooms' },
  { label: 'QR Codes', href: '/admin-qr-codes' },
  { label: 'Analytics', href: '/admin-analytics' },
  { label: 'Settings', href: '/admin-settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar items={adminNav} title="Hotel Admin" />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
