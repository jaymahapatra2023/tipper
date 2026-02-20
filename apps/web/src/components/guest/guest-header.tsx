import { Lock } from 'lucide-react';

export function GuestHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border/50 px-4 py-3">
      <span className="text-lg text-primary font-bold tracking-tight">Tipper</span>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span className="text-xs">Secure</span>
      </div>
    </header>
  );
}
