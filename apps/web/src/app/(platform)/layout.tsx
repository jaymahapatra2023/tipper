'use client';

import { useTranslations } from 'next-intl';
import { Sidebar } from '@/components/shared/sidebar';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');

  const platformNav = [
    { label: t('hotels'), href: '/platform-hotels' },
    { label: t('analytics'), href: '/platform-analytics' },
    { label: t('payouts'), href: '/platform-payouts' },
    { label: t('auditLog'), href: '/platform-audit-log' },
    { label: t('settings'), href: '/platform-settings' },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar items={platformNav} title={t('platformTitle')}>
        {children}
      </Sidebar>
    </div>
  );
}
