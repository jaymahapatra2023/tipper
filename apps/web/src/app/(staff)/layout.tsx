'use client';

import { LayoutDashboard, Receipt, ClipboardList, Wallet, Settings, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sidebar } from '@/components/shared/sidebar';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');

  const staffNav = [
    { label: t('dashboard'), href: '/staff-dashboard', icon: LayoutDashboard },
    { label: t('performance'), href: '/staff-performance', icon: BarChart3 },
    { label: t('myTips'), href: '/staff-tips', icon: Receipt },
    { label: t('assignments'), href: '/staff-assignments', icon: ClipboardList },
    { label: t('payouts'), href: '/staff-payouts', icon: Wallet },
    { label: t('settings'), href: '/staff-settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar items={staffNav} title={t('staffTitle')}>
        {children}
      </Sidebar>
    </div>
  );
}
