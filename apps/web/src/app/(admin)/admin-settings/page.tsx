'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HotelData {
  id: string;
  name: string;
  suggestedAmounts: number[];
  minTipAmount: number;
  maxTipAmount: number;
  poolingEnabled: boolean;
  poolingType: string | null;
}

interface StripeStatus {
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
}

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<HotelData>('/admin/hotel'),
      api.get<StripeStatus>('/admin/stripe/status'),
    ]).then(([hotelRes, stripeRes]) => {
      if (hotelRes.success && hotelRes.data) setHotel(hotelRes.data);
      if (stripeRes.success && stripeRes.data) setStripeStatus(stripeRes.data);
      setLoading(false);
    });
  }, []);

  // Re-fetch stripe status when returning from onboarding
  useEffect(() => {
    if (searchParams.get('stripe') === 'complete') {
      api.get<StripeStatus>('/admin/stripe/status').then((res) => {
        if (res.success && res.data) setStripeStatus(res.data);
      });
    }
  }, [searchParams]);

  async function saveSettings() {
    if (!hotel) return;
    setSaving(true);
    await api.put('/admin/hotel/settings', {
      suggestedAmounts: hotel.suggestedAmounts,
      minTipAmount: hotel.minTipAmount,
      maxTipAmount: hotel.maxTipAmount,
      poolingEnabled: hotel.poolingEnabled,
      poolingType: hotel.poolingType,
      currency: 'usd',
    });
    setSaving(false);
  }

  async function startStripeOnboarding() {
    setStripeLoading(true);
    const res = await api.post<{ url: string }>('/admin/stripe/onboard', {
      returnUrl: window.location.origin + '/admin-settings',
    });
    if (res.success && res.data) {
      window.location.href = res.data.url;
    }
    setStripeLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (!hotel) return <div>Failed to load hotel settings</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Hotel Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>Connect your Stripe account to receive tip payments</CardDescription>
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
                  Account ID: {stripeStatus.stripeAccountId}
                </p>
              </div>
            </div>
          ) : stripeStatus?.stripeAccountId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your Stripe account has been created but onboarding is not complete.
              </p>
              <Button onClick={startStripeOnboarding} disabled={stripeLoading}>
                {stripeLoading ? 'Redirecting...' : 'Complete Stripe Onboarding'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect a Stripe account to start receiving tip payments from guests.
              </p>
              <Button onClick={startStripeOnboarding} disabled={stripeLoading}>
                {stripeLoading ? 'Redirecting...' : 'Connect Stripe Account'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tip Configuration</CardTitle>
          <CardDescription>Configure suggested tip amounts and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Suggested Amounts (cents)</Label>
            <div className="flex gap-2 mt-2">
              {hotel.suggestedAmounts.map((amount, i) => (
                <Input
                  key={i}
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const newAmounts = [...hotel.suggestedAmounts];
                    newAmounts[i] = parseInt(e.target.value) || 0;
                    setHotel({ ...hotel, suggestedAmounts: newAmounts });
                  }}
                  className="w-24"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current: {hotel.suggestedAmounts.map((a) => formatCurrency(a)).join(', ')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Minimum Tip (cents)</Label>
              <Input
                type="number"
                value={hotel.minTipAmount}
                onChange={(e) =>
                  setHotel({ ...hotel, minTipAmount: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Maximum Tip (cents)</Label>
              <Input
                type="number"
                value={hotel.maxTipAmount}
                onChange={(e) =>
                  setHotel({ ...hotel, maxTipAmount: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tip Pooling</CardTitle>
          <CardDescription>Configure how tips are distributed among staff</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Enable Tip Pooling</span>
            <Button
              variant={hotel.poolingEnabled ? 'default' : 'outline'}
              onClick={() => setHotel({ ...hotel, poolingEnabled: !hotel.poolingEnabled })}
            >
              {hotel.poolingEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          {hotel.poolingEnabled && (
            <div className="flex gap-2">
              <Button
                variant={hotel.poolingType === 'equal' ? 'default' : 'outline'}
                onClick={() => setHotel({ ...hotel, poolingType: 'equal' })}
              >
                Equal Split
              </Button>
              <Button
                variant={hotel.poolingType === 'weighted' ? 'default' : 'outline'}
                onClick={() => setHotel({ ...hotel, poolingType: 'weighted' })}
              >
                Weighted
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
