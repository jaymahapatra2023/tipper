'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput, type UserRole } from '@tipper/shared';
import { ShieldCheck, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyMfa, verifyMfaRecovery } = useAuth();
  const t = useTranslations('auth');
  const [error, setError] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

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

  async function onSubmit(data: LoginInput) {
    try {
      setError('');
      const result = await login(data.email, data.password);
      if ('mfaRequired' in result) {
        setMfaToken(result.mfaToken);
        return;
      }
      if (result.needsMfaSetup) {
        router.push('/mfa-setup');
        return;
      }
      router.push(redirectForRole(result.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  async function onMfaSubmit() {
    if (!mfaToken) return;
    try {
      setError('');
      setMfaSubmitting(true);
      let user;
      if (recoveryMode) {
        user = await verifyMfaRecovery(mfaToken, recoveryCode);
      } else {
        user = await verifyMfa(mfaToken, mfaCode);
      }
      router.push(redirectForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setMfaSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-surface bg-mesh">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold tracking-tight text-primary">
            Tipper
          </Link>
          <p className="text-sm text-muted-foreground mt-1">{t('signInToAccount')}</p>
          <div className="mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        <Card className="overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader className="text-center">
            <CardTitle>{mfaToken ? t('mfaRequired') : t('welcomeBack')}</CardTitle>
            <CardDescription>
              {mfaToken
                ? recoveryMode
                  ? t('mfaRecoveryCode')
                  : t('mfaEnterCode')
                : t('signInToAccount')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mfaToken ? (
              <div className="space-y-4">
                {recoveryMode ? (
                  <div>
                    <Label htmlFor="recovery">{t('mfaRecoveryCode')}</Label>
                    <Input
                      id="recovery"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Enter recovery code"
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="mfaCode">{t('mfaCode')}</Label>
                    <Input
                      id="mfaCode"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                      autoFocus
                    />
                  </div>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  className="w-full"
                  onClick={onMfaSubmit}
                  disabled={mfaSubmitting || (!recoveryMode && mfaCode.length !== 6)}
                >
                  {mfaSubmitting ? t('verifying') : t('mfaVerify')}
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-primary hover:underline"
                  onClick={() => {
                    setRecoveryMode(!recoveryMode);
                    setError('');
                  }}
                >
                  {recoveryMode ? t('mfaBackToCode') : t('mfaUseRecovery')}
                </button>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="email">{t('emailLabel')}</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder="you@example.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">{t('passwordLabel')}</Label>
                  <Input id="password" type="password" {...form.register('password')} />
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    {t('forgotPassword')}
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? t('signingIn') : t('signIn')}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {t('noAccount')}{' '}
              <Link href="/register" className="text-primary hover:underline">
                {t('createAccount')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
