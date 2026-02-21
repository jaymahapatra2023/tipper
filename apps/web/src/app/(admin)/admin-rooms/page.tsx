'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DoorOpen } from 'lucide-react';
import { roomCreateSchema, type RoomCreateInput } from '@tipper/shared';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface RoomData {
  id: string;
  roomNumber: string;
  floor: number;
  roomType: string | null;
  isActive: boolean;
  qrCodes: { id: string; code: string }[];
}

export default function AdminRoomsPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<RoomCreateInput>({
    resolver: zodResolver(roomCreateSchema),
    defaultValues: { floor: 1 },
  });

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    const res = await api.get<RoomData[]>('/admin/rooms');
    if (res.success && res.data) setRooms(res.data);
    setLoading(false);
  }

  async function onSubmit(data: RoomCreateInput) {
    const res = await api.post('/admin/rooms', data);
    if (res.success) {
      form.reset();
      setShowForm(false);
      loadRooms();
    }
  }

  // Group by floor
  const byFloor = rooms.reduce<Record<number, RoomData[]>>((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <PageHeader title={t('roomsTitle')} description={t('roomsDesc')}>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? tc('cancel') : t('addRoom')}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('addRoom')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="roomNumber">{t('roomNumber')}</Label>
                  <Input id="roomNumber" {...form.register('roomNumber')} />
                </div>
                <div>
                  <Label htmlFor="floor">{t('floor')}</Label>
                  <Input
                    id="floor"
                    type="number"
                    {...form.register('floor', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="roomType">{t('typeOptional')}</Label>
                  <Input id="roomType" {...form.register('roomType')} placeholder="standard" />
                </div>
              </div>
              <Button type="submit">{t('addRoom')}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : Object.keys(byFloor).length === 0 ? (
        <EmptyState icon={DoorOpen} title={t('noRoomsYet')} description={t('addFirstRoom')} />
      ) : (
        Object.entries(byFloor)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([floor, floorRooms]) => (
            <Card key={floor}>
              <CardHeader>
                <CardTitle>
                  {t('floor')} {floor}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {floorRooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between rounded-xl border-border/60 border p-4 transition-all hover:shadow-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {t('roomNumber')} {room.roomNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {room.roomType || 'standard'}
                        </p>
                      </div>
                      <Badge variant={room.qrCodes.length > 0 ? 'success' : 'secondary'}>
                        {room.qrCodes.length > 0 ? t('qrActive') : t('noQr')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
      )}
    </div>
  );
}
