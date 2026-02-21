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
  children?: React.ReactNode;
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

export function Sidebar({ items, title, children }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const hasBranding = !!(user?.hotel?.primaryColor || user?.hotel?.secondaryColor);
  const accentColor = user?.hotel?.primaryColor;
  const bgColor = user?.hotel?.secondaryColor;

  return (
    <>
      <aside
        className={cn(
          'flex h-screen w-64 flex-col border-r',
          hasBranding
            ? 'border-white/10'
            : 'glass-panel border-border/60 bg-gradient-to-b from-card to-slate-50/80',
        )}
        style={
          hasBranding
            ? { background: `linear-gradient(to bottom, ${bgColor}, ${bgColor}ee)` }
            : undefined
        }
      >
        <div
          className="h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent"
          style={
            accentColor
              ? {
                  background: `linear-gradient(to right, ${accentColor}, ${accentColor}80, transparent)`,
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
                className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
              />
            )}
            <div>
              <Link
                href="/"
                className={cn(
                  'font-display text-2xl font-semibold tracking-tight',
                  hasBranding ? 'text-white' : 'text-primary',
                )}
              >
                {user?.hotel?.name || 'Tipper'}
              </Link>
              <p
                className={cn(
                  'text-xs font-medium uppercase tracking-wider mt-1',
                  hasBranding ? 'text-white/60' : 'text-muted-foreground/70',
                )}
              >
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
                  hasBranding
                    ? isActive
                      ? 'border-white bg-white/15 text-white font-semibold shadow-sm'
                      : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white hover:-translate-y-0.5'
                    : isActive
                      ? 'border-primary bg-primary/12 text-primary font-semibold shadow-sm'
                      : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:-translate-y-0.5',
                )}
                style={
                  hasBranding && isActive && accentColor
                    ? { borderColor: accentColor, color: accentColor }
                    : undefined
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={cn('border-t p-4', hasBranding ? 'border-white/10' : '')}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ring-1',
                hasBranding
                  ? 'bg-white/15 text-white ring-white/20'
                  : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary ring-primary/10',
              )}
            >
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-medium truncate', hasBranding && 'text-white')}>
                {user?.name}
              </p>
              <p
                className={cn(
                  'text-xs truncate',
                  hasBranding ? 'text-white/60' : 'text-muted-foreground',
                )}
              >
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'mt-2 w-full',
              hasBranding && 'text-white/80 hover:text-white hover:bg-white/10',
            )}
            onClick={logout}
          >
            Log Out
          </Button>
        </div>
      </aside>
      {children && (
        <main
          className={cn('flex-1 overflow-auto p-8', hasBranding ? '' : 'bg-surface bg-dot-pattern')}
          style={hasBranding ? { backgroundColor: `${bgColor}0d`, color: '#1a1a1a' } : undefined}
        >
          {children}
        </main>
      )}
    </>
  );
}
