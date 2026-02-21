import Link from 'next/link';
import { QrCode, HandCoins, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Tipper</h1>
          <nav className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Cashless tipping for modern hotels
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Digital Tipping for <span className="text-primary">Hotel Staff</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Show your appreciation for hotel cleaning staff with easy, cashless tips. Scan the QR
            code in your room, choose an amount, and tip securely.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/register">
              <Button variant="gold" size="xl">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Hotel Admin Login
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <QrCode className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Scan QR Code</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Find the QR code in your hotel room and scan it with your phone
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HandCoins className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Choose Amount</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Select a suggested amount or enter a custom tip
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Pay Securely</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Pay with credit card, Apple Pay, or Google Pay via Stripe
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t bg-muted/30 py-8 text-center text-sm text-muted-foreground">
        <p>Tipper - Digital Tipping Platform</p>
      </footer>
    </div>
  );
}
