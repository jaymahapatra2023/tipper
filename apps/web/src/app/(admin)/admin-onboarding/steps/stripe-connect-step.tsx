'use client';

import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface StripeConnectStepProps {
  onComplete: () => void;
  onSkip: () => void;
  stripeReturn: string | null;
}

export function StripeConnectStep({ onComplete, onSkip, stripeReturn }: StripeConnectStepProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(!!stripeReturn);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stripeReturn === 'complete') {
      setChecking(true);
      api.get<{ stripeOnboarded: boolean }>('/admin/stripe/status').then((res) => {
        if (res.success && res.data?.stripeOnboarded) {
          setConnected(true);
        }
        setChecking(false);
      });
    }
  }, [stripeReturn]);

  async function startStripeOnboarding() {
    try {
      setError('');
      setLoading(true);
      const returnUrl = window.location.origin + '/admin-onboarding';
      const res = await api.post<{ url: string }>('/admin/stripe/onboard', { returnUrl });
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res.error?.message || 'Failed to start Stripe setup');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Checking Stripe connection...</p>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <p className="font-medium">Stripe Connected!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your account is set up to receive payments.
          </p>
        </div>
        <Button onClick={onComplete} className="w-full">
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CreditCard className="h-8 w-8" />
        </div>
        <p className="text-sm text-muted-foreground">
          Connect your Stripe account to receive tip payments. You'll be redirected to Stripe to
          complete the setup.
        </p>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <Button onClick={startStripeOnboarding} disabled={loading} className="w-full">
        <ExternalLink className="h-4 w-4 mr-2" />
        {loading ? 'Redirecting to Stripe...' : 'Connect Stripe Account'}
      </Button>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip for Now
        </Button>
      </div>
    </div>
  );
}
