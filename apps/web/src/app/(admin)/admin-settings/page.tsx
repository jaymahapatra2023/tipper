'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, MapPin, Palette, Upload, Trash2, MessageSquare, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { HotelHero } from '@/components/ui/hotel-hero';

interface HotelData {
  id: string;
  name: string;
  suggestedAmounts: number[];
  minTipAmount: number;
  maxTipAmount: number;
  poolingEnabled: boolean;
  poolingType: string | null;
  mfaRequired: boolean;
  geofenceEnabled: boolean;
  geofenceLatitude: number | null;
  geofenceLongitude: number | null;
  geofenceRadius: number;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  feedbackTags: string[];
}

interface StripeStatus {
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminSettingsContent />
    </Suspense>
  );
}

function AdminSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandingPrimary, setBrandingPrimary] = useState<string>('');
  const [brandingSecondary, setBrandingSecondary] = useState<string>('');
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [tagsSaving, setTagsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<HotelData>('/admin/hotel'),
      api.get<StripeStatus>('/admin/stripe/status'),
      api.get<{ mfaEnabled: boolean }>('/auth/me'),
    ]).then(([hotelRes, stripeRes, meRes]) => {
      if (hotelRes.success && hotelRes.data) {
        setHotel(hotelRes.data);
        setLogoPreview(hotelRes.data.logoUrl);
        setBrandingPrimary(hotelRes.data.primaryColor || '');
        setBrandingSecondary(hotelRes.data.secondaryColor || '');
        setFeedbackTags(hotelRes.data.feedbackTags || []);
      }
      if (stripeRes.success && stripeRes.data) setStripeStatus(stripeRes.data);
      if (meRes.success && meRes.data) setMfaEnabled(meRes.data.mfaEnabled ?? false);
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
      mfaRequired: hotel.mfaRequired,
      currency: 'usd',
      geofenceEnabled: hotel.geofenceEnabled,
      geofenceLatitude: hotel.geofenceLatitude,
      geofenceLongitude: hotel.geofenceLongitude,
      geofenceRadius: hotel.geofenceRadius,
      feedbackTags: feedbackTags.length > 0 ? feedbackTags : undefined,
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

  async function handleLogoUpload(file: File) {
    if (!hotel) return;
    try {
      const res = await api.post<{ uploadUrl: string; publicUrl: string }>(
        '/admin/hotel/branding/upload-url',
        { contentType: file.type },
      );
      if (!res.success || !res.data) return;

      await fetch(res.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      setLogoPreview(res.data.publicUrl);
    } catch {
      // Upload failed silently
    }
  }

  async function saveBranding() {
    setBrandingSaving(true);
    const res = await api.put('/admin/hotel/branding', {
      logoUrl: logoPreview || null,
      primaryColor: brandingPrimary || null,
      secondaryColor: brandingSecondary || null,
    });
    if (res.success && hotel) {
      setHotel({
        ...hotel,
        logoUrl: logoPreview,
        primaryColor: brandingPrimary || null,
        secondaryColor: brandingSecondary || null,
      });
    }
    setBrandingSaving(false);
  }

  if (loading) return <LoadingSpinner />;
  if (!hotel) return <div>Failed to load hotel settings</div>;

  return (
    <div className="space-y-8">
      <PageHeader title="Hotel Settings" description="Configure your hotel's tipping preferences" />

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
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

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Your Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Badge variant={mfaEnabled ? 'success' : 'secondary'}>
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            {mfaEnabled ? (
              <Button
                variant="outline"
                disabled={mfaLoading}
                onClick={async () => {
                  if (
                    !confirm(
                      'This will disable two-factor authentication on your account. Continue?',
                    )
                  )
                    return;
                  setMfaLoading(true);
                  const res = await api.post('/auth/mfa/disable');
                  if (res.success) setMfaEnabled(false);
                  setMfaLoading(false);
                }}
              >
                {mfaLoading ? 'Disabling...' : 'Disable MFA'}
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
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Hotel Security Policy
          </CardTitle>
          <CardDescription>
            Require all staff members to use two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Require MFA for Staff</p>
              <p className="text-sm text-muted-foreground">
                Staff without MFA will be prompted to set it up on next login
              </p>
            </div>
            <Button
              variant={hotel.mfaRequired ? 'default' : 'outline'}
              onClick={() => setHotel({ ...hotel, mfaRequired: !hotel.mfaRequired })}
            >
              {hotel.mfaRequired ? 'Required' : 'Optional'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Hotel Branding
          </CardTitle>
          <CardDescription>
            Customize your hotel&apos;s logo and colors for the guest tip flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live preview */}
          <div>
            <Label className="mb-2 block">Preview</Label>
            <HotelHero
              hotelName={hotel.name}
              logoUrl={logoPreview || undefined}
              primaryColor={brandingPrimary || undefined}
              secondaryColor={brandingSecondary || undefined}
            />
          </div>

          {/* Logo upload */}
          <div>
            <Label className="mb-2 block">Hotel Logo</Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {logoPreview ? 'Change' : 'Upload'}
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLogoPreview(null)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WebP. Max 2MB.</p>
          </div>

          {/* Color pickers */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandingPrimary || '#0f1b2d'}
                  onChange={(e) => setBrandingPrimary(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border border-border"
                />
                <Input
                  value={brandingPrimary}
                  onChange={(e) => setBrandingPrimary(e.target.value)}
                  placeholder="#0f1b2d"
                  className="flex-1"
                />
                {brandingPrimary && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBrandingPrimary('')}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandingSecondary || '#1a2744'}
                  onChange={(e) => setBrandingSecondary(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border border-border"
                />
                <Input
                  value={brandingSecondary}
                  onChange={(e) => setBrandingSecondary(e.target.value)}
                  placeholder="#1a2744"
                  className="flex-1"
                />
                {brandingSecondary && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBrandingSecondary('')}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Button onClick={saveBranding} disabled={brandingSaving}>
            {brandingSaving ? 'Saving...' : 'Save Branding'}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Guest Feedback Tags
          </CardTitle>
          <CardDescription>
            Configure the feedback tags guests can select when rating their stay. If none are set,
            default tags will be used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {feedbackTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setFeedbackTags((prev) => prev.filter((t) => t !== tag))}
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {feedbackTags.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No custom tags configured. Default tags will be shown to guests.
              </p>
            )}
          </div>
          {feedbackTags.length < 10 && (
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                maxLength={50}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newTag.trim();
                    if (trimmed && !feedbackTags.includes(trimmed)) {
                      setFeedbackTags((prev) => [...prev, trimmed]);
                      setNewTag('');
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!newTag.trim() || feedbackTags.includes(newTag.trim())}
                onClick={() => {
                  const trimmed = newTag.trim();
                  if (trimmed && !feedbackTags.includes(trimmed)) {
                    setFeedbackTags((prev) => [...prev, trimmed]);
                    setNewTag('');
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {feedbackTags.length}/10 tags. Press Enter or click + to add.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
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

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
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

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Verification
          </CardTitle>
          <CardDescription>
            Optionally verify that guests are at the hotel when tipping. This is a soft check — it
            warns but never blocks a tip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Geofence</p>
              <p className="text-sm text-muted-foreground">
                Verify guest location when they leave a tip
              </p>
            </div>
            <Button
              variant={hotel.geofenceEnabled ? 'default' : 'outline'}
              onClick={() => setHotel({ ...hotel, geofenceEnabled: !hotel.geofenceEnabled })}
            >
              {hotel.geofenceEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          {hotel.geofenceEnabled && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 40.7128"
                    value={hotel.geofenceLatitude ?? ''}
                    onChange={(e) =>
                      setHotel({
                        ...hotel,
                        geofenceLatitude: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. -74.0060"
                    value={hotel.geofenceLongitude ?? ''}
                    onChange={(e) =>
                      setHotel({
                        ...hotel,
                        geofenceLongitude: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Radius (meters)</Label>
                <Input
                  type="number"
                  min={50}
                  max={5000}
                  value={hotel.geofenceRadius}
                  onChange={(e) =>
                    setHotel({
                      ...hotel,
                      geofenceRadius: parseInt(e.target.value) || 500,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  50–5000 meters. Default is 500m.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                To find your hotel&apos;s coordinates, search for it on Google Maps, right-click the
                location, and copy the latitude and longitude.
              </p>
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
