'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { hotelOnboardSchema, type HotelOnboardInput } from '@tipper/shared';
import { Hotel } from 'lucide-react';
import { api } from '@/lib/api';
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

export default function RegisterHotelPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const form = useForm<HotelOnboardInput>({
    resolver: zodResolver(hotelOnboardSchema),
  });

  async function onSubmit(data: HotelOnboardInput) {
    try {
      setError('');
      const res = await api.post<{ user: { id: string }; accessToken: string }>(
        '/auth/register/hotel',
        data,
      );
      if (res.success && res.data) {
        api.setToken(res.data.accessToken);
        router.push('/admin-dashboard');
      } else {
        setError(res.error?.message || 'Registration failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-surface bg-mesh">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold tracking-tight text-primary">
            Tipper
          </Link>
          <p className="text-sm text-muted-foreground mt-1">
            Launch cashless tipping at your hotel
          </p>
          <div className="mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        <Card className="overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Hotel className="h-6 w-6" />
            </div>
            <CardTitle>Register Your Hotel</CardTitle>
            <CardDescription>
              Create your hotel account and start receiving digital tips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="hotelName">Hotel Name</Label>
                <Input
                  id="hotelName"
                  {...form.register('hotelName')}
                  placeholder="The Grand Hotel"
                />
                {form.formState.errors.hotelName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.hotelName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input id="name" {...form.register('name')} placeholder="John Smith" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="you@hotel.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...form.register('password')} />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating Account...' : 'Get Started'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
