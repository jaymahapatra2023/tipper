'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  if (isLoading) return null;

  if (user) {
    const dashboardPath = getDashboardPath(user.role);
    return (
      <nav className="flex items-center gap-4">
        {dashboardPath && (
          <Link href={dashboardPath}>
            <Button variant="ghost">Dashboard</Button>
          </Link>
        )}
        <span className="text-sm text-muted-foreground">{user.name}</span>
        <Button variant="outline" onClick={logout}>
          Log Out
        </Button>
      </nav>
    );
  }

  return (
    <nav className="flex gap-4">
      <Link href="/login">
        <Button variant="ghost">Log In</Button>
      </Link>
      <Link href="/register">
        <Button>Sign Up</Button>
      </Link>
    </nav>
  );
}
