'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  processedAt: string | null;
  createdAt: string;
}

export default function StaffPayoutsPage() {
  const t = useTranslations('staff');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Payout[]>('/staff/payouts').then((res) => {
      if (res.success && res.data) setPayouts(res.data);
      setLoading(false);
    });
  }, []);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">{tc('completed')}</Badge>;
      case 'processing':
        return <Badge variant="warning">{tc('processing')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{tc('failed')}</Badge>;
      default:
        return <Badge variant="secondary">{tc('pending')}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t('payoutsTitle')} description={t('payoutsDesc')} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : payouts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={t('noPayoutsYet')}
              description={t('payoutHistoryAppear')}
            />
          ) : (
            <div className="space-y-1">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{formatCurrency(p.amount, p.currency, locale)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(p.createdAt, locale)}
                    </p>
                  </div>
                  {statusBadge(p.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
