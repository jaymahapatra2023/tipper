'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@tipper/shared';
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

export default function RegisterPage() {
  const router = useRouter();
  const { register: signup } = useAuth();
  const t = useTranslations('auth');
  const [error, setError] = useState('');

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    try {
      setError('');
      const user = await signup(data.email, data.password, data.name);
      const redirect =
        user.role === 'platform_admin'
          ? '/platform-hotels'
          : user.role === 'hotel_admin'
            ? '/admin-dashboard'
            : user.role === 'staff'
              ? '/staff-dashboard'
              : '/';
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-surface bg-mesh">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold tracking-tight text-primary">
            Tipper
          </Link>
          <p className="text-sm text-muted-foreground mt-1">{t('joinTipper')}</p>
          <div className="mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        <Card className="overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader className="text-center">
            <CardTitle>{t('createAccount')}</CardTitle>
            <CardDescription>{t('joinTipper')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">{t('fullName')}</Label>
                <Input id="name" {...form.register('name')} placeholder="John Doe" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('creatingAccount') : t('createAccount')}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {t('hasAccount')}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {t('signIn')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
