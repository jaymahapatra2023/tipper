import { GuestHeader } from '@/components/guest/guest-header';
import { GuestFooter } from '@/components/guest/guest-footer';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-guest flex min-h-screen flex-col bg-background">
      <GuestHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <GuestFooter />
    </div>
  );
}
