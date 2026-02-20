'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
        return <Badge variant="success">Approved</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Hotels</h1>

      <div className="flex gap-2">
        {['', 'pending', 'approved', 'suspended'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f || 'All'}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : hotels.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hotels found</p>
          ) : (
            <div className="space-y-4">
              {hotels.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{h.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {h.city}, {h.state} | {h._count.rooms} rooms | {h._count.staffMembers} staff |{' '}
                      {h._count.tips} tips
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(h.status)}
                    {h.status === 'pending' && (
                      <Button size="sm" onClick={() => approveHotel(h.id)}>
                        Approve
                      </Button>
                    )}
                    {h.status === 'approved' && (
                      <Button size="sm" variant="destructive" onClick={() => suspendHotel(h.id)}>
                        Suspend
                      </Button>
                    )}
                    {h.status === 'suspended' && (
                      <Button size="sm" onClick={() => approveHotel(h.id)}>
                        Reactivate
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
