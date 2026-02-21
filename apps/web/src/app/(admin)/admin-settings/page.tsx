'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  MapPin,
  Palette,
  Upload,
  Trash2,
  MessageSquare,
  Plus,
  X,
  Trophy,
  Weight,
  Globe,
} from 'lucide-react';
import type { PoolDistributionPreview } from '@tipper/shared';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
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
  leaderboardEnabled: boolean;
  leaderboardAnonymized: boolean;
  timezone: string;
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
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const ts = useTranslations('shifts');
  const locale = useLocale();
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
  const [poolPreview, setPoolPreview] = useState<PoolDistributionPreview[]>([]);
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
        if (hotelRes.data.poolingEnabled && hotelRes.data.poolingType === 'weighted') {
          api.get<PoolDistributionPreview[]>('/admin/pool/preview').then((res) => {
            if (res.success && res.data) setPoolPreview(res.data);
          });
        }
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
      leaderboardEnabled: hotel.leaderboardEnabled,
      leaderboardAnonymized: hotel.leaderboardAnonymized,
      timezone: hotel.timezone,
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
  if (!hotel) return <div>{tc('failedToLoad')}</div>;

  return (
    <div className="space-y-8">
      <PageHeader title={t('settingsTitle')} description={t('settingsDesc')} />

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>{t('stripeConnect')}</CardTitle>
          <CardDescription>{t('stripeConnectDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripeStatus?.stripeOnboarded ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm font-bold">
                ✓
              </div>
              <div>
                <p className="font-medium">{t('stripeConnected')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('stripeAccountId')}: {stripeStatus.stripeAccountId}
                </p>
              </div>
            </div>
          ) : stripeStatus?.stripeAccountId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('stripeIncomplete')}</p>
              <Button onClick={startStripeOnboarding} disabled={stripeLoading}>
                {stripeLoading ? t('redirecting') : t('completeStripeOnboarding')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('connectStripeAccount')}</p>
              <Button onClick={startStripeOnboarding} disabled={stripeLoading}>
                {stripeLoading ? t('redirecting') : t('connectStripe')}
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
            {t('yourMfa')}
          </CardTitle>
          <CardDescription>{t('mfaSecurityDesc')}</CardDescription>
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
                {mfaLoading ? t('disablingMfa') : t('disableMfa')}
              </Button>
            ) : (
              <Button onClick={() => router.push('/mfa-setup')}>{t('setUpMfa')}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t('hotelSecurityPolicy')}
          </CardTitle>
          <CardDescription>{t('requireMfaDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('requireMfaForStaff')}</p>
              <p className="text-sm text-muted-foreground">{t('requireMfaHint')}</p>
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
            {t('hotelBranding')}
          </CardTitle>
          <CardDescription>{t('hotelBrandingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live preview */}
          <div>
            <Label className="mb-2 block">{t('preview')}</Label>
            <HotelHero
              hotelName={hotel.name}
              logoUrl={logoPreview || undefined}
              primaryColor={brandingPrimary || undefined}
              secondaryColor={brandingSecondary || undefined}
            />
          </div>

          {/* Logo upload */}
          <div>
            <Label className="mb-2 block">{t('hotelLogo')}</Label>
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
            <p className="mt-1 text-xs text-muted-foreground">{t('logoUploadHint')}</p>
          </div>

          {/* Color pickers */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">{t('primaryColor')}</Label>
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
              <Label className="mb-2 block">{t('secondaryColor')}</Label>
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
            {brandingSaving ? tc('saving') : t('saveBranding')}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('guestFeedbackTags')}
          </CardTitle>
          <CardDescription>{t('feedbackTagsDesc')}</CardDescription>
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
              <p className="text-sm text-muted-foreground">{t('noCustomTags')}</p>
            )}
          </div>
          {feedbackTags.length < 10 && (
            <div className="flex gap-2">
              <Input
                placeholder={t('addTag') + '...'}
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
            {t('tagsCount', { count: feedbackTags.length, max: 10 })}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>{t('tipConfiguration')}</CardTitle>
          <CardDescription>{t('tipConfigDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('suggestedAmounts')}</Label>
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
              {t('currentAmounts')}:{' '}
              {hotel.suggestedAmounts.map((a) => formatCurrency(a, 'usd', locale)).join(', ')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('minimumTip')}</Label>
              <Input
                type="number"
                value={hotel.minTipAmount}
                onChange={(e) =>
                  setHotel({ ...hotel, minTipAmount: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>{t('maximumTip')}</Label>
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
          <CardTitle>{t('tipPooling')}</CardTitle>
          <CardDescription>{t('tipPoolingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>{t('enableTipPooling')}</span>
            <Button
              variant={hotel.poolingEnabled ? 'default' : 'outline'}
              onClick={() => setHotel({ ...hotel, poolingEnabled: !hotel.poolingEnabled })}
            >
              {hotel.poolingEnabled ? tc('enabled') : tc('disabled')}
            </Button>
          </div>
          {hotel.poolingEnabled && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={hotel.poolingType === 'equal' ? 'default' : 'outline'}
                  onClick={() => {
                    setHotel({ ...hotel, poolingType: 'equal' });
                    setPoolPreview([]);
                  }}
                >
                  {t('equalSplit')}
                </Button>
                <Button
                  variant={hotel.poolingType === 'weighted' ? 'default' : 'outline'}
                  onClick={() => {
                    setHotel({ ...hotel, poolingType: 'weighted' });
                    api.get<PoolDistributionPreview[]>('/admin/pool/preview').then((res) => {
                      if (res.success && res.data) setPoolPreview(res.data);
                    });
                  }}
                >
                  {t('weighted')}
                </Button>
              </div>
              {hotel.poolingType === 'weighted' && poolPreview.length > 0 && (
                <div className="rounded-lg border">
                  <div className="border-b bg-muted/50 px-4 py-2.5">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Weight className="h-4 w-4" />
                      {t('poolPreviewTitle')}
                    </p>
                  </div>
                  <div className="divide-y">
                    {poolPreview.map((p) => (
                      <div
                        key={p.staffMemberId}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <span>{p.staffName}</span>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{p.weight}x</Badge>
                          <span className="w-16 text-right text-muted-foreground">
                            {p.sharePercent}%
                          </span>
                          <span className="w-16 text-right font-medium">
                            {formatCurrency(p.shareAmount, 'usd', locale)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                    {t('editWeightsHint')}{' '}
                    <a href="/admin-staff" className="underline hover:text-foreground">
                      {t('staffManagementPage')}
                    </a>{' '}
                    {t('page')}.
                  </div>
                </div>
              )}
              {hotel.poolingType === 'weighted' && poolPreview.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('noPoolStaff')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t('staffLeaderboard')}
          </CardTitle>
          <CardDescription>{t('staffLeaderboardDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('enableLeaderboard')}</p>
              <p className="text-sm text-muted-foreground">{t('leaderboardHint')}</p>
            </div>
            <Button
              variant={hotel.leaderboardEnabled ? 'default' : 'outline'}
              onClick={() => setHotel({ ...hotel, leaderboardEnabled: !hotel.leaderboardEnabled })}
            >
              {hotel.leaderboardEnabled ? tc('enabled') : tc('disabled')}
            </Button>
          </div>
          {hotel.leaderboardEnabled && (
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-medium">{t('anonymizeNames')}</p>
                <p className="text-sm text-muted-foreground">{t('anonymizeHint')}</p>
              </div>
              <Button
                variant={hotel.leaderboardAnonymized ? 'default' : 'outline'}
                onClick={() =>
                  setHotel({ ...hotel, leaderboardAnonymized: !hotel.leaderboardAnonymized })
                }
              >
                {hotel.leaderboardAnonymized ? t('anonymized') : t('visible')}
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
            {t('locationVerification')}
          </CardTitle>
          <CardDescription>{t('locationVerificationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('enableGeofence')}</p>
              <p className="text-sm text-muted-foreground">{t('geofenceHint')}</p>
            </div>
            <Button
              variant={hotel.geofenceEnabled ? 'default' : 'outline'}
              onClick={() => setHotel({ ...hotel, geofenceEnabled: !hotel.geofenceEnabled })}
            >
              {hotel.geofenceEnabled ? tc('enabled') : tc('disabled')}
            </Button>
          </div>
          {hotel.geofenceEnabled && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('latitude')}</Label>
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
                  <Label>{t('longitude')}</Label>
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
                <Label>{t('radiusMeters')}</Label>
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
                <p className="text-xs text-muted-foreground mt-1">{t('radiusHint')}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('coordsHint')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {ts('timezone')}
          </CardTitle>
          <CardDescription>{ts('timezoneDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={hotel.timezone ?? 'America/New_York'}
            onChange={(e) => setHotel({ ...hotel, timezone: e.target.value })}
          >
            {[
              'America/New_York',
              'America/Chicago',
              'America/Denver',
              'America/Los_Angeles',
              'America/Anchorage',
              'Pacific/Honolulu',
              'Europe/London',
              'Europe/Paris',
              'Europe/Berlin',
              'Asia/Tokyo',
              'Asia/Shanghai',
              'Asia/Dubai',
              'Australia/Sydney',
            ].map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving}>
        {saving ? tc('saving') : t('saveSettings')}
      </Button>
    </div>
  );
}
