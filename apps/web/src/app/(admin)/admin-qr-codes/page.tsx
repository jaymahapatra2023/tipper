'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">QR Codes</h1>
        <Button variant="outline">Download All (ZIP)</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
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
