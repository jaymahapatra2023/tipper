'use client';

import { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface RoomWithQr {
  id: string;
  roomNumber: string;
  floor: number;
  qrCodes: { id: string; code: string; scanCount: number }[];
}

export default function AdminQrCodesPage() {
  const [rooms, setRooms] = useState<RoomWithQr[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    const res = await api.get<RoomWithQr[]>('/admin/rooms');
    if (res.success && res.data) setRooms(res.data);
    setLoading(false);
  }

  async function regenerateQr(roomId: string) {
    const res = await api.post(`/admin/rooms/${roomId}/qr/regenerate`);
    if (res.success) loadRooms();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="QR Codes" description="Manage QR codes for each room">
        <Button variant="outline">Download All (ZIP)</Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : rooms.length === 0 ? (
            <EmptyState
              icon={QrCode}
              title="No rooms yet"
              description="Add rooms first, then generate QR codes"
            />
          ) : (
            <div className="space-y-1">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">Room {room.roomNumber}</p>
                    <p className="text-sm text-muted-foreground">Floor {room.floor}</p>
                    {room.qrCodes[0] && (
                      <p className="text-xs text-muted-foreground">
                        Code: {room.qrCodes[0].code} | Scans: {room.qrCodes[0].scanCount}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={room.qrCodes.length > 0 ? 'success' : 'secondary'}>
                      {room.qrCodes.length > 0 ? 'Active' : 'None'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => regenerateQr(room.id)}>
                      {room.qrCodes.length > 0 ? 'Regenerate' : 'Generate'}
                    </Button>
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
