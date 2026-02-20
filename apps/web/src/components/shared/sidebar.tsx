'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  items: NavItem[];
  title: string;
}

export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="p-6">
        <Link href="/" className="text-xl font-bold text-primary">
          Tipper
        </Link>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <p className="text-sm font-medium truncate">{user?.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={logout}>
          Log Out
        </Button>
      </div>
    </aside>
  );
}
