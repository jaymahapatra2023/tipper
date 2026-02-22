'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/shared/notification-bell';
import { LanguageSelector } from '@/components/shared/language-selector';

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

function SidebarContent({
  items,
  title,
  hasBranding,
  accentColor,
  bgColor,
  user,
  pathname,
  t,
  logout,
  onNavClick,
}: {
  items: NavItem[];
  title: string;
  hasBranding: boolean;
  accentColor?: string;
  bgColor?: string;
  user: ReturnType<typeof useAuth>['user'];
  pathname: string;
  t: ReturnType<typeof useTranslations>;
  logout: () => void;
  onNavClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex h-full w-64 flex-col overflow-y-auto border-r',
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
        <NotificationBell className="hidden md:block" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
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
        <LanguageSelector
          className={cn(hasBranding && '[&_button]:text-white/70 [&_button]:hover:text-white')}
        />
        <div className="mt-3 flex items-center gap-3">
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
          {t('logOut')}
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ items, title, children }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const t = useTranslations('common');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [isOpen, setIsOpen] = useState(false);

  const hasBranding = !!(user?.hotel?.primaryColor || user?.hotel?.secondaryColor);
  const accentColor = user?.hotel?.primaryColor ?? undefined;
  const bgColor = user?.hotel?.secondaryColor ?? undefined;

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const sharedProps = {
    items,
    title,
    hasBranding,
    accentColor,
    bgColor,
    user,
    pathname,
    t,
    logout,
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile top header bar */}
        <header
          className={cn(
            'fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b px-4',
            hasBranding
              ? 'border-white/10 text-white'
              : 'border-border/60 bg-card/95 backdrop-blur-sm',
          )}
          style={hasBranding ? { backgroundColor: bgColor } : undefined}
        >
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              'rounded-lg p-2 transition-colors',
              hasBranding
                ? 'text-white/80 hover:bg-white/10 hover:text-white'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {user?.hotel?.logoUrl && (
              <img
                src={user.hotel.logoUrl}
                alt={user.hotel.name}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-white/20"
              />
            )}
            <span
              className={cn(
                'font-display text-lg font-semibold tracking-tight',
                hasBranding ? 'text-white' : 'text-primary',
              )}
            >
              {user?.hotel?.name || 'Tipper'}
            </span>
          </div>
          <NotificationBell />
        </header>

        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <div
          className={cn(
            'fixed top-0 left-0 bottom-0 z-50 transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            onClick={() => setIsOpen(false)}
            className={cn(
              'absolute top-4 right-3 z-10 rounded-lg p-1.5 transition-colors',
              hasBranding
                ? 'text-white/70 hover:bg-white/10 hover:text-white'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent {...sharedProps} onNavClick={() => setIsOpen(false)} />
        </div>

        {/* Main content */}
        {children && (
          <main
            className={cn('min-h-screen pt-14 p-4', hasBranding ? '' : 'bg-surface bg-dot-pattern')}
            style={hasBranding ? { backgroundColor: `${bgColor}0d`, color: '#1a1a1a' } : undefined}
          >
            {children}
          </main>
        )}
      </>
    );
  }

  // Desktop layout
  return (
    <>
      <aside className="h-screen shrink-0">
        <SidebarContent {...sharedProps} />
      </aside>
      {children && (
        <main
          className={cn(
            'flex-1 overflow-auto p-4 md:p-8',
            hasBranding ? '' : 'bg-surface bg-dot-pattern',
          )}
          style={hasBranding ? { backgroundColor: `${bgColor}0d`, color: '#1a1a1a' } : undefined}
        >
          {children}
        </main>
      )}
    </>
  );
}
