'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffCreateSchema, type StaffCreateInput } from '@tipper/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StaffInviteStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface AddedStaff {
  name: string;
  email: string;
}

export function StaffInviteStep({ onComplete, onSkip }: StaffInviteStepProps) {
  const [addedStaff, setAddedStaff] = useState<AddedStaff[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<StaffCreateInput>({
    resolver: zodResolver(staffCreateSchema),
  });

  async function onSubmit(data: StaffCreateInput) {
    try {
      setError('');
      setSubmitting(true);
      const res = await api.post('/admin/staff', data);
      if (res.success) {
        setAddedStaff((prev) => [...prev, { name: data.name, email: data.email }]);
        form.reset();
      } else {
        setError(res.error?.message || 'Failed to add staff');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Invite housekeeping staff by email. They'll receive a welcome email with login credentials.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register('name')} placeholder="Jane Doe" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              placeholder="jane@email.com"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Adding...' : 'Add Staff Member'}
        </Button>
      </form>

      {addedStaff.length > 0 && (
        <div className="rounded-lg bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-medium">Staff Added: {addedStaff.length}</p>
          {addedStaff.map((s, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {s.name} ({s.email})
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip
        </Button>
        <Button onClick={onComplete} className="flex-1" disabled={addedStaff.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
