'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface StripeStatus {
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
}

export default function StaffSettingsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StaffSettingsContent />
    </Suspense>
  );
}

function StaffSettingsContent() {
  const { user } = useAuth();
  const t = useTranslations('staff');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const [poolOptIn, setPoolOptIn] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    Promise.all([
      api.get<StripeStatus>('/staff/stripe/status'),
      api.get<{ mfaEnabled: boolean }>('/auth/me'),
    ]).then(([stripeRes, meRes]) => {
      if (stripeRes.success && stripeRes.data) setStripeStatus(stripeRes.data);
      if (meRes.success && meRes.data) setMfaEnabled(meRes.data.mfaEnabled ?? false);
    });
  }, []);

  // Re-fetch stripe status when returning from onboarding
  useEffect(() => {
    if (searchParams.get('stripe') === 'complete') {
      api.get<StripeStatus>('/staff/stripe/status').then((res) => {
        if (res.success && res.data) setStripeStatus(res.data);
      });
    }
  }, [searchParams]);

  async function togglePoolOptIn() {
    const newValue = !poolOptIn;
    const res = await api.put('/staff/pool-opt-in', { optIn: newValue });
    if (res.success) setPoolOptIn(newValue);
  }

  async function startStripeOnboarding() {
    setStripeLoading(true);
    const res = await api.post<{ url: string }>('/staff/stripe/onboard', {
      returnUrl: window.location.origin + '/staff-settings',
    });
    if (res.success && res.data) {
      window.location.href = res.data.url;
    }
    setStripeLoading(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('settingsTitle')} description={t('settingsDesc')} />

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="text-muted-foreground">{tc('name')}:</span> {user?.name}
          </p>
          <p>
            <span className="text-muted-foreground">{tc('email')}:</span> {user?.email}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t('twoFactorAuth')}
          </CardTitle>
          <CardDescription>{t('twoFactorDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{tc('status')}:</span>
              <Badge variant={mfaEnabled ? 'success' : 'secondary'}>
                {mfaEnabled ? tc('enabled') : tc('disabled')}
              </Badge>
            </div>
            {mfaEnabled ? (
              <Button
                variant="outline"
                disabled={mfaLoading}
                onClick={async () => {
                  if (!confirm(t('disableMfaConfirm'))) return;
                  setMfaLoading(true);
                  const res = await api.post('/auth/mfa/disable');
                  if (res.success) setMfaEnabled(false);
                  setMfaLoading(false);
                }}
              >
                {mfaLoading ? tc('saving') : 'Disable MFA'}
              </Button>
            ) : (
              <Button onClick={() => router.push('/mfa-setup')}>Set Up MFA</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>{t('tipPoolingTitle')}</CardTitle>
          <CardDescription>{t('tipPoolingDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>{t('participatePooling')}</span>
            <Button variant={poolOptIn ? 'default' : 'outline'} onClick={togglePoolOptIn}>
              {poolOptIn ? t('optedIn') : t('optIn')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>{t('bankAccount')}</CardTitle>
          <CardDescription>{t('bankAccountDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripeStatus?.stripeOnboarded ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm font-bold">
                ✓
              </div>
              <div>
                <p className="font-medium">{t('stripeConnected')}</p>
                <p className="text-sm text-muted-foreground">{t('stripeReadyDesc')}</p>
              </div>
            </div>
          ) : stripeStatus?.stripeAccountId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('stripeIncomplete')}</p>
              <Button onClick={startStripeOnboarding} disabled={stripeLoading}>
                {stripeLoading ? tc('loading') : t('completeStripeSetup')}
              </Button>
            </div>
          ) : (
            <Button onClick={startStripeOnboarding} disabled={stripeLoading}>
              {stripeLoading ? tc('loading') : t('setupPayoutsStripe')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
