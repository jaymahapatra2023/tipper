'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { hotelProfileSchema, type HotelProfileInput } from '@tipper/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HotelProfileStepProps {
  onComplete: () => void;
}

export function HotelProfileStep({ onComplete }: HotelProfileStepProps) {
  const [error, setError] = useState('');

  const form = useForm<HotelProfileInput>({
    resolver: zodResolver(hotelProfileSchema),
    defaultValues: {
      country: 'US',
    },
  });

  useEffect(() => {
    api.get<HotelProfileInput>('/admin/hotel').then((res) => {
      if (res.success && res.data) {
        const hotel = res.data;
        if (hotel.name) form.setValue('name', hotel.name);
        if (hotel.address) form.setValue('address', hotel.address);
        if (hotel.city) form.setValue('city', hotel.city);
        if (hotel.state) form.setValue('state', hotel.state);
        if (hotel.zipCode) form.setValue('zipCode', hotel.zipCode);
        if (hotel.country) form.setValue('country', hotel.country);
        if (hotel.phone) form.setValue('phone', hotel.phone);
        if (hotel.email) form.setValue('email', hotel.email);
        if (hotel.website) form.setValue('website', hotel.website);
      }
    });
  }, [form]);

  async function onSubmit(data: HotelProfileInput) {
    try {
      setError('');
      const res = await api.put('/admin/hotel/profile', data);
      if (res.success) {
        onComplete();
      } else {
        setError(res.error?.message || 'Failed to save profile');
      }
    } catch {
      setError('Something went wrong');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Hotel Name *</Label>
        <Input id="name" {...form.register('name')} placeholder="The Grand Hotel" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="address">Address *</Label>
        <Input id="address" {...form.register('address')} placeholder="123 Main St" />
        {form.formState.errors.address && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input id="city" {...form.register('city')} placeholder="New York" />
          {form.formState.errors.city && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.city.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="state">State *</Label>
          <Input id="state" {...form.register('state')} placeholder="NY" />
          {form.formState.errors.state && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.state.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="zipCode">ZIP Code *</Label>
          <Input id="zipCode" {...form.register('zipCode')} placeholder="10001" />
          {form.formState.errors.zipCode && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.zipCode.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="country">Country *</Label>
          <Input id="country" {...form.register('country')} placeholder="US" />
          {form.formState.errors.country && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.country.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" {...form.register('phone')} placeholder="(555) 123-4567" />
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" {...form.register('email')} placeholder="info@hotel.com" />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="website">Website (optional)</Label>
        <Input id="website" {...form.register('website')} placeholder="https://www.hotel.com" />
        {form.formState.errors.website && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.website.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
      </Button>
    </form>
  );
}
