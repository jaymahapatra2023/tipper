'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/shared/language-selector';

function getDashboardPath(role: string) {
  switch (role) {
    case 'platform_admin':
      return '/platform-hotels';
    case 'hotel_admin':
      return '/admin-dashboard';
    case 'staff':
      return '/staff-dashboard';
    default:
      return null;
  }
}

export function LandingNav() {
  const { user, isLoading, logout } = useAuth();
  const t = useTranslations('common');

  if (isLoading) return null;

  if (user) {
    const dashboardPath = getDashboardPath(user.role);
    return (
      <nav className="flex items-center gap-3">
        {dashboardPath && (
          <Link href={dashboardPath}>
            <Button variant="ghost">{t('dashboard')}</Button>
          </Link>
        )}
        <span className="hidden rounded-full border border-border/70 bg-card/70 px-3 py-1 text-sm text-muted-foreground md:inline">
          {user.name}
        </span>
        <LanguageSelector />
        <Button variant="outline" onClick={logout}>
          {t('logOut')}
        </Button>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2">
      <LanguageSelector />
      <Link href="/login">
        <Button variant="ghost">{t('logIn')}</Button>
      </Link>
      <Link href="/register">
        <Button>{t('signUp')}</Button>
      </Link>
    </nav>
  );
}
