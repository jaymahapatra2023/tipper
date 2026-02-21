'use client';

import Link from 'next/link';
import { QrCode, HandCoins, CreditCard, Sparkles, Hotel, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/shared/landing-nav';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/75 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-primary">
            Tipper
          </h1>
          <LandingNav />
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center bg-mesh px-4 py-14">
        <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-8 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative max-w-4xl text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/20">
            <Sparkles className="h-4 w-4" />
            {t('badge')}
          </div>
          <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            {t('heroTitle1')}
            <br />
            {t('heroTitle2')} <span className="text-primary">{t('heroTitle3')}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('heroDescription')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register-hotel">
              <Button variant="gold" size="xl">
                {t('ctaLaunch')}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                {t('ctaLogin')}
              </Button>
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="group glass-panel rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                <Hotel className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t('featureHotelTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('featureHotelDesc')}
              </p>
            </div>
            <div className="group glass-panel rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform duration-200 group-hover:scale-110">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t('featureSecureTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('featureSecureDesc')}
              </p>
            </div>
            <div className="group glass-panel rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 transition-transform duration-200 group-hover:scale-110">
                <HandCoins className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t('featurePayoutsTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('featurePayoutsDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="group glass-panel rounded-2xl p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
              <QrCode className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t('stepScanTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('stepScanDesc')}
            </p>
          </div>
          <div className="group glass-panel rounded-2xl p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
              <HandCoins className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t('stepAmountTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('stepAmountDesc')}
            </p>
          </div>
          <div className="group glass-panel rounded-2xl p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
              <CreditCard className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t('stepPayTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('stepPayDesc')}</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 bg-card/55 py-8 text-center text-sm text-muted-foreground backdrop-blur">
        <p>{t('footerCopyright', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
