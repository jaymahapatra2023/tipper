'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/shared/notification-bell';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  items: NavItem[];
  title: string;
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="glass-panel flex h-screen w-64 flex-col border-r border-border/60 bg-gradient-to-b from-card to-slate-50/80">
      <div
        className="h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent"
        style={
          user?.hotel?.primaryColor
            ? {
                background: `linear-gradient(to right, ${user.hotel.primaryColor}, ${user.hotel.primaryColor}80, transparent)`,
              }
            : undefined
        }
      />

      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          {user?.hotel?.logoUrl && (
            <img
              src={user.hotel.logoUrl}
              alt={user.hotel.name}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-border/40"
            />
          )}
          <div>
            <Link
              href="/"
              className="font-display text-2xl font-semibold tracking-tight text-primary"
            >
              {user?.hotel?.name || 'Tipper'}
            </Link>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
              {title}
            </p>
          </div>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all border-l-2',
                isActive
                  ? 'border-primary bg-primary/12 text-primary font-semibold shadow-sm'
                  : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:-translate-y-0.5',
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-medium ring-1 ring-primary/10">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={logout}>
          Log Out
        </Button>
      </div>
    </aside>
  );
}
