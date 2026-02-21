'use client';

import { useEffect, useState } from 'react';
import {
  QrCode,
  Download,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Palette,
  Save,
  ExternalLink,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface RoomWithQr {
  id: string;
  roomNumber: string;
  floor: number;
  qrCodes: { id: string; code: string; scanCount: number }[];
}

interface HotelData {
  id: string;
  logoUrl: string | null;
  qrForegroundColor: string | null;
  qrBackgroundColor: string | null;
  qrStyle: string;
  qrLogoEnabled: boolean;
}

type QrStyleOption = 'square' | 'rounded' | 'dots';

export default function AdminQrCodesPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const [rooms, setRooms] = useState<RoomWithQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // QR customization state
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrStyle, setQrStyle] = useState<QrStyleOption>('square');
  const [logoEnabled, setLogoEnabled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadRooms();
    loadHotelData();
  }, []);

  async function loadRooms() {
    setLoading(true);
    const res = await api.get<RoomWithQr[]>('/admin/rooms');
    if (res.success && res.data) setRooms(res.data);
    setLoading(false);
  }

  async function loadHotelData() {
    const res = await api.get<HotelData>('/admin/hotel');
    if (res.success && res.data) {
      setFgColor(res.data.qrForegroundColor || '#000000');
      setBgColor(res.data.qrBackgroundColor || '#ffffff');
      setQrStyle((res.data.qrStyle as QrStyleOption) || 'square');
      setLogoEnabled(res.data.qrLogoEnabled || false);
      setLogoUrl(res.data.logoUrl);
    }
  }

  async function saveQrSettings() {
    setSaving(true);
    setSaveMessage('');
    const res = await api.put('/admin/hotel/branding', {
      qrForegroundColor: fgColor === '#000000' ? null : fgColor,
      qrBackgroundColor: bgColor === '#ffffff' ? null : bgColor,
      qrStyle,
      qrLogoEnabled: logoEnabled,
    });
    if (res.success) {
      setSaveMessage('QR settings saved successfully.');
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSaveMessage('Failed to save. Please try again.');
    }
    setSaving(false);
  }

  async function regenerateQr(roomId: string) {
    const res = await api.post(`/admin/rooms/${roomId}/qr/regenerate`);
    if (res.success) loadRooms();
  }

  async function downloadFile(format: 'zip' | 'pdf') {
    setDownloading(true);
    try {
      const blob = await api.downloadBlob(`/admin/qr/download/${format}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-codes.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function regenerateAll() {
    const confirmed = window.confirm(
      'This will regenerate ALL QR codes. Any previously printed or distributed codes will stop working. Are you sure?',
    );
    if (!confirmed) return;

    setRegenerating(true);
    try {
      const res = await api.post<{ generated: number; total: number }>('/admin/qr/regenerate-all');
      if (res.success && res.data) {
        alert(`Successfully regenerated ${res.data.generated} QR codes.`);
        loadRooms();
      }
    } catch {
      alert('Regeneration failed. Please try again.');
    } finally {
      setRegenerating(false);
    }
  }

  const styleLabels: Record<QrStyleOption, string> = {
    square: t('square'),
    rounded: t('rounded'),
    dots: t('dots'),
  };

  // Determine CSS class for QR style preview
  const qrStyleClass =
    qrStyle === 'dots'
      ? '[&_rect]:rx-[50%] [&_path]:!stroke-none'
      : qrStyle === 'rounded'
        ? '[&_rect]:rx-[3px]'
        : '';

  return (
    <div className="space-y-8">
      <PageHeader title={t('qrTitle')} description={t('qrDesc')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={downloading || regenerating}>
              {downloading ? tc('loading') : regenerating ? tc('loading') : 'Bulk Actions'}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => downloadFile('zip')} disabled={downloading}>
              <Download className="h-4 w-4" />
              Download ZIP
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadFile('pdf')} disabled={downloading}>
              <FileText className="h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={regenerateAll} disabled={regenerating}>
              <RefreshCw className="h-4 w-4" />
              Regenerate All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* QR Customization Card */}
      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader className="cursor-pointer" onClick={() => setCustomizerOpen(!customizerOpen)}>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('customization')}
            </span>
            {customizerOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        {customizerOpen && (
          <CardContent className="space-y-6">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
              {/* Controls */}
              <div className="space-y-5">
                {/* Colors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-2 block">{t('foregroundColor')}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded border border-border"
                      />
                      <Input
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                      {fgColor !== '#000000' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFgColor('#000000')}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t('backgroundColor')}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded border border-border"
                      />
                      <Input
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                      {bgColor !== '#ffffff' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBgColor('#ffffff')}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Style selector */}
                <div>
                  <Label className="mb-2 block">{t('style')}</Label>
                  <div className="flex gap-2">
                    {(['square', 'rounded', 'dots'] as QrStyleOption[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => setQrStyle(style)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          qrStyle === style
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        {styleLabels[style]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo overlay toggle */}
                <div>
                  <Label className="mb-2 block">{t('embedLogo')}</Label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setLogoEnabled(!logoEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        logoEnabled ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          logoEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-sm">{t('embedLogo')}</span>
                  </div>
                  {logoEnabled && !logoUrl && (
                    <p className="mt-2 text-sm text-amber-600">
                      No logo uploaded.{' '}
                      <a
                        href="/admin-settings"
                        className="inline-flex items-center gap-1 underline hover:no-underline"
                      >
                        Upload logo in Settings
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  )}
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3">
                  <Button onClick={saveQrSettings} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? tc('saving') : tc('save')}
                  </Button>
                  {saveMessage && (
                    <span
                      className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {saveMessage}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Changes will apply to new downloads. Existing printed codes remain scannable.
                </p>
              </div>

              {/* Live Preview */}
              <div className="flex flex-col items-center gap-3">
                <Label className="text-sm font-medium">{t('preview')}</Label>
                <div
                  className="rounded-xl border border-border p-4"
                  style={{ backgroundColor: bgColor }}
                >
                  <div className={qrStyleClass}>
                    <QRCodeSVG
                      value="https://example.com/tip/preview"
                      size={180}
                      level="H"
                      fgColor={fgColor}
                      bgColor={bgColor}
                      imageSettings={
                        logoEnabled && logoUrl
                          ? {
                              src: logoUrl,
                              height: 36,
                              width: 36,
                              excavate: true,
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Room 101 (sample)</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : rooms.length === 0 ? (
            <EmptyState icon={QrCode} title={t('noRoomsForQr')} description={t('addRoomsFirst')} />
          ) : (
            <div className="space-y-1">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{room.roomNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('floor')} {room.floor}
                    </p>
                    {room.qrCodes[0] && (
                      <p className="text-xs text-muted-foreground">
                        Code: {room.qrCodes[0].code} | Scans: {room.qrCodes[0].scanCount}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={room.qrCodes.length > 0 ? 'success' : 'secondary'}>
                      {room.qrCodes.length > 0 ? tc('active') : 'None'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => regenerateQr(room.id)}>
                      {room.qrCodes.length > 0 ? t('regenerate') : t('generate')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
