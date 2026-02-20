import { ShieldCheck, Lock } from 'lucide-react';

export function GuestFooter() {
  return (
    <footer className="mt-auto border-t border-border/50 px-4 py-6">
      <div className="mx-auto max-w-md space-y-3">
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
            <span>100% goes to staff</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-primary/70" />
            <span>Encrypted &amp; secure</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground/60">
          Powered by Tipper &middot; &copy; 2026
        </p>
      </div>
    </footer>
  );
}
