'use client';

import {
  LayoutDashboard,
  Users,
  DoorOpen,
  QrCode,
  BarChart3,
  Shield,
  Settings,
  CalendarClock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sidebar } from '@/components/shared/sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');

  const adminNav = [
    { label: t('dashboard'), href: '/admin-dashboard', icon: LayoutDashboard },
    { label: t('staff'), href: '/admin-staff', icon: Users },
    { label: t('rooms'), href: '/admin-rooms', icon: DoorOpen },
    { label: t('shifts'), href: '/admin-shifts', icon: CalendarClock },
    { label: t('qrCodes'), href: '/admin-qr-codes', icon: QrCode },
    { label: t('analytics'), href: '/admin-analytics', icon: BarChart3 },
    { label: t('auditLog'), href: '/admin-audit-log', icon: Shield },
    { label: t('settings'), href: '/admin-settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar items={adminNav} title={t('adminTitle')}>
        {children}
      </Sidebar>
    </div>
  );
}
