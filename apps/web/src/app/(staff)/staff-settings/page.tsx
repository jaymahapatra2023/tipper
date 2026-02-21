'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';

interface StripeStatus {
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
}

export default function StaffSettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [poolOptIn, setPoolOptIn] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    api.get<StripeStatus>('/staff/stripe/status').then((res) => {
      if (res.success && res.data) setStripeStatus(res.data);
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
      <PageHeader title="Settings" description="Manage your profile and payout preferences" />

      <Card className="overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="text-muted-foreground">Name:</span> {user?.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {user?.email}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>Tip Pooling</CardTitle>
          <CardDescription>
            When enabled, tips for the hotel are shared among all opted-in staff members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Participate in tip pooling</span>
            <Button variant={poolOptIn ? 'default' : 'outline'} onClick={togglePoolOptIn}>
              {poolOptIn ? 'Opted In' : 'Opt In'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>Bank Account</CardTitle>
          <CardDescription>Connect your bank account to receive payouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripeStatus?.stripeOnboarded ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm font-bold">
                ✓
              </div>
              <div>
                <p className="font-medium">Stripe account connected</p>
                <p className="text-sm text-muted-foreground">
                  Your payout account is set up and ready to receive tips.
                </p>
              </div>
            </div>
          ) : stripeStatus?.stripeAccountId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your Stripe account has been created but setup is not complete.
              </p>
              <Button onClick={startStripeOnboarding} disabled={stripeLoading}>
                {stripeLoading ? 'Redirecting...' : 'Complete Stripe Setup'}
              </Button>
            </div>
          ) : (
            <Button onClick={startStripeOnboarding} disabled={stripeLoading}>
              {stripeLoading ? 'Redirecting...' : 'Set Up Payouts with Stripe'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
