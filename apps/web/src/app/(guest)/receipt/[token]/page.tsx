'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Building2,
  DoorOpen,
  Calendar,
  Users,
  MessageSquare,
  Star,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReceiptData } from '@tipper/shared';

export default function ReceiptPage() {
  const params = useParams();
  const token = params.token as string;
  const t = useTranslations('guest');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ReceiptData>(`/tips/receipt/${token}`).then((res) => {
      if (res.success && res.data) {
        setReceipt(res.data);
      } else {
        setError(res.error?.message || t('receiptNotFound'));
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
            <p className="text-lg font-semibold text-destructive">{t('receiptNotFound')}</p>
            <p className="text-sm text-muted-foreground">{error || t('receiptInvalid')}</p>
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
          <h2 className="text-3xl font-bold tracking-tight">{t('receiptTitle')}</h2>
          {receipt.guestName && (
            <p className="mt-2 text-muted-foreground">
              {t('thankYouGuest', { name: receipt.guestName })}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 text-center">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(receipt.totalAmount, receipt.currency, locale)}
              </span>
            </div>
            <div className="divide-y divide-border/50">
              <div className="flex items-center gap-3 py-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{t('hotel')}</span>
                <span className="ml-auto text-sm font-medium text-right">{receipt.hotelName}</span>
              </div>
              {receipt.hotelAddress && (
                <div className="flex items-center gap-3 py-3">
                  <span className="w-4" />
                  <span className="text-sm text-muted-foreground">{t('address')}</span>
                  <span className="ml-auto text-sm font-medium text-right">
                    {receipt.hotelAddress}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 py-3">
                <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{t('room')}</span>
                <span className="ml-auto text-sm font-medium">{receipt.roomNumber}</span>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{t('datePaid')}</span>
                <span className="ml-auto text-sm font-medium">
                  {formatDate(receipt.paidAt, locale)}
                </span>
              </div>
              {receipt.staffNames.length > 0 && (
                <div className="flex items-center gap-3 py-3">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{t('staffLabel')}</span>
                  <span className="ml-auto text-sm font-medium text-right">
                    {receipt.staffNames.join(', ')}
                  </span>
                </div>
              )}
              {receipt.message && (
                <div className="flex items-start gap-3 py-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{t('message')}</span>
                  <span className="ml-auto text-sm font-medium text-right italic">
                    &ldquo;{receipt.message}&rdquo;
                  </span>
                </div>
              )}
              {receipt.rating != null && (
                <div className="flex items-center gap-3 py-3">
                  <Star className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{t('rating')}</span>
                  <div className="ml-auto flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= receipt.rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {receipt.feedbackTags && receipt.feedbackTags.length > 0 && (
                <div className="flex items-start gap-3 py-3">
                  <span className="w-4" />
                  <span className="text-sm text-muted-foreground">{t('feedback')}</span>
                  <div className="ml-auto flex flex-wrap justify-end gap-1">
                    {receipt.feedbackTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          {t('tipMethod')}:{' '}
          {receipt.tipMethod === 'per_day' ? t('tipMethodPerDay') : t('tipMethodFlat')} &middot;{' '}
          {t('stay')}: {formatDate(receipt.checkInDate, locale)} &ndash;{' '}
          {formatDate(receipt.checkOutDate, locale)}
        </p>
      </div>
    </div>
  );
}
