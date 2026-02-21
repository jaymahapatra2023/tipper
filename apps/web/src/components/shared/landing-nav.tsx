'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

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

  if (isLoading) return null;

  if (user) {
    const dashboardPath = getDashboardPath(user.role);
    return (
      <nav className="flex items-center gap-3">
        {dashboardPath && (
          <Link href={dashboardPath}>
            <Button variant="ghost">Dashboard</Button>
          </Link>
        )}
        <span className="hidden rounded-full border border-border/70 bg-card/70 px-3 py-1 text-sm text-muted-foreground md:inline">
          {user.name}
        </span>
        <Button variant="outline" onClick={logout}>
          Log Out
        </Button>
      </nav>
    );
  }

  return (
    <nav className="flex gap-2">
      <Link href="/login">
        <Button variant="ghost">Log In</Button>
      </Link>
      <Link href="/register">
        <Button>Sign Up</Button>
      </Link>
    </nav>
  );
}
