'use client';

import { useEffect, useState } from 'react';
import { QrCode, Download, FileText, RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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

  async function downloadFile(format: 'zip' | 'pdf') {
    setDownloading(true);
    try {
      const blob = await api.downloadBlob(`/admin/qr/download/${format}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-codes.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function regenerateAll() {
    const confirmed = window.confirm(
      'This will regenerate ALL QR codes. Any previously printed or distributed codes will stop working. Are you sure?',
    );
    if (!confirmed) return;

    setRegenerating(true);
    try {
      const res = await api.post<{ generated: number; total: number }>('/admin/qr/regenerate-all');
      if (res.success && res.data) {
        alert(`Successfully regenerated ${res.data.generated} QR codes.`);
        loadRooms();
      }
    } catch {
      alert('Regeneration failed. Please try again.');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="QR Codes" description="Manage QR codes for each room">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={downloading || regenerating}>
              {downloading ? 'Downloading...' : regenerating ? 'Regenerating...' : 'Bulk Actions'}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => downloadFile('zip')} disabled={downloading}>
              <Download className="h-4 w-4" />
              Download ZIP
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadFile('pdf')} disabled={downloading}>
              <FileText className="h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={regenerateAll} disabled={regenerating}>
              <RefreshCw className="h-4 w-4" />
              Regenerate All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
