'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface HotelListItem {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
  _count: { rooms: number; staffMembers: number; tips: number };
}

export default function PlatformHotelsPage() {
  const t = useTranslations('platform');
  const tc = useTranslations('common');
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadHotels();
  }, [filter]);

  async function loadHotels() {
    setLoading(true);
    const url = filter ? `/platform/hotels?status=${filter}` : '/platform/hotels';
    const res = await api.get<HotelListItem[]>(url);
    if (res.success && res.data) setHotels(res.data);
    setLoading(false);
  }

  async function approveHotel(id: string) {
    await api.put(`/platform/hotels/${id}/approve`);
    loadHotels();
  }

  async function suspendHotel(id: string) {
    await api.put(`/platform/hotels/${id}/suspend`);
    loadHotels();
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">{t('approved')}</Badge>;
      case 'suspended':
        return <Badge variant="destructive">{t('suspended')}</Badge>;
      default:
        return <Badge variant="warning">{tc('pending')}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t('hotelsTitle')} description={t('hotelsDesc')} />

      <div className="flex gap-2">
        {['', 'pending', 'approved', 'suspended'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'ghost'}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter(f)}
          >
            {f || tc('allActions').split(' ')[0]}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : hotels.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={t('noHotels')}
              description={t('hotelsWillAppear')}
            />
          ) : (
            <div className="space-y-1">
              {hotels.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{h.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {h.city}, {h.state} | {h._count.rooms} {t('rooms')} | {h._count.staffMembers}{' '}
                      {t('staffCount')} | {h._count.tips} tips
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(h.status)}
                    {h.status === 'pending' && (
                      <Button size="sm" onClick={() => approveHotel(h.id)}>
                        {t('approve')}
                      </Button>
                    )}
                    {h.status === 'approved' && (
                      <Button size="sm" variant="destructive" onClick={() => suspendHotel(h.id)}>
                        {t('suspend')}
                      </Button>
                    )}
                    {h.status === 'suspended' && (
                      <Button size="sm" onClick={() => approveHotel(h.id)}>
                        {t('approve')}
                      </Button>
                    )}
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
