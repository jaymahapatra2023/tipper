'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Copy, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MfaSetupResponse, UserRole } from '@tipper/shared';

function redirectForRole(role: UserRole) {
  switch (role) {
    case 'platform_admin':
      return '/platform-hotels';
    case 'hotel_admin':
      return '/admin-dashboard';
    case 'staff':
      return '/staff-dashboard';
    default:
      return '/';
  }
}

export default function MfaSetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('auth');
  const [step, setStep] = useState<'loading' | 'scan' | 'verify' | 'done'>('loading');
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  async function startSetup() {
    const res = await api.post<MfaSetupResponse>('/auth/mfa/setup');
    if (res.success && res.data) {
      setSetupData(res.data);
      setStep('scan');
    } else {
      setError(res.error?.message || 'Failed to start MFA setup');
    }
  }

  async function verifyCode() {
    setSubmitting(true);
    setError('');
    const res = await api.post<{ message: string }>('/auth/mfa/setup/confirm', { code });
    if (res.success) {
      setStep('done');
      setTimeout(() => {
        if (user) router.push(redirectForRole(user.role));
      }, 2000);
    } else {
      setError(res.error?.message || 'Invalid code');
    }
    setSubmitting(false);
  }

  function copyRecoveryCodes() {
    if (setupData) {
      navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-surface bg-mesh">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold tracking-tight text-primary">
            Tipper
          </Link>
          <div className="mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        <Card className="overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>{t('mfaTitle')}</CardTitle>
            <CardDescription>
              {step === 'loading' && t('mfaSetupDesc')}
              {step === 'scan' && t('mfaSetupDesc')}
              {step === 'verify' && t('mfaVerifyCode')}
              {step === 'done' && t('mfaDone')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'loading' && (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">{t('mfaSetupDesc')}</p>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={startSetup} className="w-full">
                  {t('verifyAndEnable')}
                </Button>
              </div>
            )}

            {step === 'scan' && setupData && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-xl border bg-white p-4">
                    <QRCodeSVG value={setupData.qrCodeUrl} size={200} />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">{t('mfaRecoveryCodes')}</p>
                  <p className="text-xs text-muted-foreground mb-3">{t('mfaRecoveryDesc')}</p>
                  <div className="grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/30 p-3">
                    {setupData.recoveryCodes.map((code) => (
                      <code key={code} className="text-xs font-mono text-center py-0.5">
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={copyRecoveryCodes}
                  >
                    {copiedCodes ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> {t('mfaRecoveryCodes')}
                      </>
                    )}
                  </Button>
                </div>

                <Button onClick={() => setStep('verify')} className="w-full">
                  {t('continue')}
                </Button>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">{t('mfaCode')}</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  onClick={verifyCode}
                  className="w-full"
                  disabled={submitting || code.length !== 6}
                >
                  {submitting ? t('verifying') : t('verifyAndEnable')}
                </Button>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <p className="text-sm text-muted-foreground">{t('mfaDone')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
