'use client';

import { useEffect, useState } from 'react';
import {
  Receipt,
  DollarSign,
  Wallet,
  TrendingUp,
  BarChart3,
  Download,
  ChevronDown,
  Star,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface AnalyticsData {
  totalTips: number;
  totalAmount: number;
  netAmount: number;
  averageTip: number;
  averageRating?: number;
  ratedTipCount?: number;
  ratingDistribution?: { rating: number; count: number }[];
  tipsByRoom: { roomNumber: string; count: number; total: number }[];
  tipsByStaff?: { staffName: string; count: number; total: number; averageRating?: number }[];
  tipsByDate: { date: string; count: number; total: number }[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  async function downloadExport(type: 'tips' | 'payouts' | 'staff') {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const blob = await api.downloadBlob(`/admin/analytics/export?${params.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — the blob call already throws on non-ok
    } finally {
      setExporting(false);
    }
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadExport('tips')}>Tips CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadExport('payouts')}>
                  Payouts CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadExport('staff')}>
                  Staff Performance CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : (
        data && (
          <>
            <div className="grid gap-4 md:grid-cols-5">
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
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Average Rating</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                    <Star className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">
                    {data.averageRating != null
                      ? `${Math.round(data.averageRating * 10) / 10}/5`
                      : 'N/A'}
                  </p>
                  {data.ratedTipCount != null && data.ratedTipCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.ratedTipCount} rated tip{data.ratedTipCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {data.ratingDistribution && data.ratingDistribution.some((r) => r.count > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.ratingDistribution.map((r) => {
                      const maxCount = Math.max(
                        ...(data.ratingDistribution?.map((d) => d.count) ?? [1]),
                      );
                      const pct = maxCount > 0 ? (r.count / maxCount) * 100 : 0;
                      return (
                        <div key={r.rating} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-12 justify-end">
                            <span className="text-sm font-medium">{r.rating}</span>
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-yellow-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {r.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.tipsByStaff && data.tipsByStaff.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tips by Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {data.tipsByStaff.map((s) => (
                      <div
                        key={s.staffName}
                        className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{s.staffName}</p>
                            <p className="text-sm text-muted-foreground">
                              {s.count} tip{s.count !== 1 ? 's' : ''}
                              {s.averageRating != null && (
                                <span className="ml-2">
                                  {s.averageRating}/5
                                  <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400 ml-0.5 -mt-0.5" />
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium">{formatCurrency(s.total)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
