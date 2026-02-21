'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface PlatformSettings {
  id: string;
  defaultPlatformFeePercent: number;
}

export default function PlatformSettingsPage() {
  const t = useTranslations('platform');
  const tc = useTranslations('common');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<PlatformSettings>('/platform/settings').then((res) => {
      if (res.success && res.data) setSettings(res.data);
      setLoading(false);
    });
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    await api.put('/platform/settings', {
      defaultPlatformFeePercent: settings.defaultPlatformFeePercent,
    });
    setSaving(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader title={t('settingsTitle')} description={t('settingsDesc')} />

      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle>{t('defaultFeePercent')}</CardTitle>
          <CardDescription>{t('feeDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('defaultFeePercent')} (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={settings?.defaultPlatformFeePercent ?? 10}
              onChange={(e) =>
                setSettings(
                  settings
                    ? { ...settings, defaultPlatformFeePercent: parseFloat(e.target.value) || 0 }
                    : null,
                )
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('feeDescription')}</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? tc('saving') : t('saveSettingsBtn')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
