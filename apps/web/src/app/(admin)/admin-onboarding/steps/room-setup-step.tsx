'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roomBulkGenerateSchema, type RoomBulkGenerateInput } from '@tipper/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RoomSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface FloorBatch {
  floor: number;
  startRoom: number;
  endRoom: number;
  roomType?: string;
  prefix?: string;
}

export function RoomSetupStep({ onComplete, onSkip }: RoomSetupStepProps) {
  const [batches, setBatches] = useState<FloorBatch[]>([]);
  const [totalCreated, setTotalCreated] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<RoomBulkGenerateInput>({
    resolver: zodResolver(roomBulkGenerateSchema),
    defaultValues: { floor: 1, startRoom: 101, endRoom: 110 },
  });

  async function addBatch(data: RoomBulkGenerateInput) {
    try {
      setError('');
      setSubmitting(true);
      const res = await api.post<{ created: number; total: number }>(
        '/admin/rooms/bulk-generate',
        data,
      );
      if (res.success && res.data) {
        setBatches((prev) => [...prev, { ...data }]);
        setTotalCreated((prev) => prev + res.data!.created);
        form.reset({
          floor: data.floor + 1,
          startRoom: (data.floor + 1) * 100 + 1,
          endRoom: (data.floor + 1) * 100 + 10,
        });
      } else {
        setError(res.error?.message || 'Failed to create rooms');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const previewCount = (() => {
    const start = form.watch('startRoom');
    const end = form.watch('endRoom');
    if (start && end && end >= start) return end - start + 1;
    return 0;
  })();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add rooms by floor. You can add multiple floors one at a time.
      </p>

      <form onSubmit={form.handleSubmit(addBatch)} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="floor">Floor</Label>
            <Input id="floor" type="number" {...form.register('floor', { valueAsNumber: true })} />
            {form.formState.errors.floor && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.floor.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="startRoom">Start Room #</Label>
            <Input
              id="startRoom"
              type="number"
              {...form.register('startRoom', { valueAsNumber: true })}
            />
            {form.formState.errors.startRoom && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.startRoom.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="endRoom">End Room #</Label>
            <Input
              id="endRoom"
              type="number"
              {...form.register('endRoom', { valueAsNumber: true })}
            />
            {form.formState.errors.endRoom && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.endRoom.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="roomType">Room Type (optional)</Label>
          <Input id="roomType" {...form.register('roomType')} placeholder="Standard, Suite, etc." />
        </div>

        {previewCount > 0 && (
          <p className="text-sm text-muted-foreground">
            This will create {previewCount} room{previewCount !== 1 ? 's' : ''} on floor{' '}
            {form.watch('floor')}.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating Rooms...' : 'Add Rooms'}
        </Button>
      </form>

      {batches.length > 0 && (
        <div className="rounded-lg bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-medium">Rooms Created: {totalCreated}</p>
          {batches.map((b, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              Floor {b.floor}: rooms {b.startRoom}–{b.endRoom}
              {b.roomType && ` (${b.roomType})`}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip
        </Button>
        <Button onClick={onComplete} className="flex-1" disabled={totalCreated === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
