'use client';

import { useEffect, useState } from 'react';
import { Receipt, DollarSign, Wallet, TrendingUp, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface AnalyticsData {
  totalTips: number;
  totalAmount: number;
  netAmount: number;
  averageTip: number;
  tipsByRoom: { roomNumber: string; count: number; total: number }[];
  tipsByDate: { date: string; count: number; total: number }[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    let url = '/admin/analytics/overview';
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await api.get<AnalyticsData>(url);
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" description="Analyze tipping trends and revenue" />

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={loadAnalytics}>Apply</Button>
            <Button variant="outline">Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : (
        data && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Tips</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">{data.totalTips}</p>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Gross Amount</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatCurrency(data.totalAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Net Amount</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatCurrency(data.netAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Average Tip</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatCurrency(data.averageTip)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tips by Room</CardTitle>
              </CardHeader>
              <CardContent>
                {data.tipsByRoom.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No data for this period"
                    description="Try adjusting the date range"
                  />
                ) : (
                  <div className="space-y-1">
                    {data.tipsByRoom.map((r) => (
                      <div
                        key={r.roomNumber}
                        className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                      >
                        <span>Room {r.roomNumber}</span>
                        <span className="font-medium">
                          {formatCurrency(r.total)} ({r.count})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}
