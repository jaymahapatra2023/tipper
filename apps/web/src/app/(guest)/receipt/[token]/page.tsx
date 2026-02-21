'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Building2, DoorOpen, Calendar, Users, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReceiptData } from '@tipper/shared';

export default function ReceiptPage() {
  const params = useParams();
  const token = params.token as string;

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ReceiptData>(`/tips/receipt/${token}`).then((res) => {
      if (res.success && res.data) {
        setReceipt(res.data);
      } else {
        setError(res.error?.message || 'Receipt not found');
      }
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="mx-auto h-20 w-20 rounded-full" />
          <Skeleton className="mx-auto h-8 w-48" />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <p className="text-lg font-semibold text-destructive">Receipt Not Found</p>
            <p className="text-sm text-muted-foreground">
              {error || 'This receipt link is invalid or has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tip Receipt</h2>
          {receipt.guestName && (
            <p className="mt-2 text-muted-foreground">Thank you, {receipt.guestName}!</p>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 text-center">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(receipt.totalAmount, receipt.currency)}
              </span>
            </div>
            <div className="divide-y divide-border/50">
              <div className="flex items-center gap-3 py-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Hotel</span>
                <span className="ml-auto text-sm font-medium text-right">{receipt.hotelName}</span>
              </div>
              {receipt.hotelAddress && (
                <div className="flex items-center gap-3 py-3">
                  <span className="w-4" />
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="ml-auto text-sm font-medium text-right">
                    {receipt.hotelAddress}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 py-3">
                <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Room</span>
                <span className="ml-auto text-sm font-medium">{receipt.roomNumber}</span>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Date Paid</span>
                <span className="ml-auto text-sm font-medium">{formatDate(receipt.paidAt)}</span>
              </div>
              {receipt.staffNames.length > 0 && (
                <div className="flex items-center gap-3 py-3">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Staff</span>
                  <span className="ml-auto text-sm font-medium text-right">
                    {receipt.staffNames.join(', ')}
                  </span>
                </div>
              )}
              {receipt.message && (
                <div className="flex items-start gap-3 py-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Message</span>
                  <span className="ml-auto text-sm font-medium text-right italic">
                    &ldquo;{receipt.message}&rdquo;
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Tip method: {receipt.tipMethod === 'per_day' ? 'Per Day' : 'Flat'} &middot; Stay:{' '}
          {formatDate(receipt.checkInDate)} &ndash; {formatDate(receipt.checkOutDate)}
        </p>
      </div>
    </div>
  );
}
