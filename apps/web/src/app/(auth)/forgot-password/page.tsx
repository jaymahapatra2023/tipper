'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@tipper/shared';
import { Mail, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
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

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: { email: string }) {
    try {
      setError('');
      await api.post('/auth/forgot-password', data);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
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
            <CardTitle>{t('forgotPasswordTitle')}</CardTitle>
            <CardDescription>
              {submitted ? t('resetSent') : t('forgotPasswordDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-7 w-7" />
                </div>
                <p className="text-sm text-muted-foreground">{t('resetSent')}</p>
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
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? t('sending') : t('sendResetLink')}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('backToLogin')}
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
