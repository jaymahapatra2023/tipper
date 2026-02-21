'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
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
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Payouts" description="Track your payout history and status" />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : payouts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No payouts yet"
              description="Your payout history will appear here"
            />
          ) : (
            <div className="space-y-4">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{formatCurrency(p.amount, p.currency)}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(p.createdAt)}</p>
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
