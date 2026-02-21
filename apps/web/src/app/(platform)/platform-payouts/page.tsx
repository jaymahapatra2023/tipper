'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import type { PayoutView, PayoutAnalytics, PayoutProcessResult } from '@tipper/shared';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'processing':
      return <Badge variant="warning">Processing</Badge>;
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function PlatformPayoutsPage() {
  const [analytics, setAnalytics] = useState<PayoutAnalytics | null>(null);
  const [payouts, setPayouts] = useState<PayoutView[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [analyticsRes, payoutsRes] = await Promise.all([
      api.get<PayoutAnalytics>('/platform/payouts/analytics'),
      api.get<PayoutView[]>('/platform/payouts'),
    ]);
    if (analyticsRes.success && analyticsRes.data) setAnalytics(analyticsRes.data);
    if (payoutsRes.success && payoutsRes.data) setPayouts(payoutsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await api.post<PayoutProcessResult>('/platform/payouts/process');
      if (res.success && res.data) {
        alert(
          `Processed: ${res.data.processed}, Failed: ${res.data.failed}, Skipped: ${res.data.skipped}`,
        );
        await loadData();
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = async (payoutId: string) => {
    setRetrying(payoutId);
    try {
      const res = await api.post(`/platform/payouts/${payoutId}/retry`);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error?.message || 'Retry failed');
      }
    } finally {
      setRetrying(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <PageHeader title="Payouts" description="Manage staff payout transfers">
        <Button onClick={handleProcess} disabled={processing}>
          {processing ? 'Processing...' : 'Process Payouts Now'}
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(analytics?.totalPaid || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.paidCount || 0} payouts
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(analytics?.totalPending || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.pendingCount || 0} in queue
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Failed</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{analytics?.failedCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(analytics?.totalFailed || 0)} total
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Last 30 Days</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(analytics?.last30DaysPaid || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">paid out</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No payouts yet. Click &quot;Process Payouts Now&quot; to create payouts for unpaid
              distributions.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Staff</th>
                    <th className="pb-3 font-medium">Hotel</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Distributions</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{payout.staffName}</p>
                          <p className="text-xs text-muted-foreground">{payout.staffEmail}</p>
                        </div>
                      </td>
                      <td className="py-3">{payout.hotelName}</td>
                      <td className="py-3 font-medium">
                        {formatCurrency(payout.amount, payout.currency)}
                      </td>
                      <td className="py-3">{payout.distributionCount}</td>
                      <td className="py-3">{statusBadge(payout.status)}</td>
                      <td className="py-3 text-muted-foreground">
                        {formatDate(payout.processedAt || payout.createdAt)}
                      </td>
                      <td className="py-3">
                        {payout.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(payout.id)}
                            disabled={retrying === payout.id}
                          >
                            {retrying === payout.id ? 'Retrying...' : 'Retry'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
