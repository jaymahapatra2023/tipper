'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
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
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#84cc16',
];

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

function AnalyticsSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: { count: number } }[];
  label?: string;
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">
        {payload[0].payload.count}{' '}
        {payload[0].payload.count !== 1 ? t('ratedTipsPlural') : t('tips')}
      </p>
      <p className="text-sm font-semibold text-emerald-600">
        {formatCurrency(payload[0].value, 'usd', locale)}
      </p>
    </div>
  );
}

function RoomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { roomNumber: string; count: number } }[];
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium">{d.roomNumber}</p>
      <p className="text-sm text-muted-foreground">
        {d.count} {d.count !== 1 ? t('ratedTipsPlural') : t('tips')}
      </p>
      <p className="text-sm font-semibold text-emerald-600">
        {formatCurrency(payload[0].value, 'usd', locale)}
      </p>
    </div>
  );
}

const RADIAN = Math.PI / 180;
function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  name: string;
  percent: number;
}) {
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs fill-muted-foreground"
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

export default function AdminAnalyticsPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading((prev) => (data ? false : prev));
    let url = '/admin/analytics/overview';
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await api.get<AnalyticsData>(url);
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  }, [startDate, endDate, data]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadAnalytics, 60000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, loadAnalytics]);

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

  const topRooms =
    data?.tipsByRoom
      ?.slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 10) ?? [];

  const staffPieData =
    data?.tipsByStaff?.map((s) => ({
      name: s.staffName,
      value: s.total,
    })) ?? [];

  const dateData =
    data?.tipsByDate?.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title={t('analyticsTitle')} description={t('analyticsDesc')} />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>{tc('startDate')}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{tc('endDate')}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={loadAnalytics}>{tc('search')}</Button>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? t('autoRefreshOn') : t('autoRefresh')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? tc('exporting') : tc('exportCsv')}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadExport('tips')}>
                  {t('tipsCsv')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadExport('payouts')}>
                  {t('payoutsCsv')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadExport('staff')}>
                  {t('staffPerfCsv')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <AnalyticsSkeleton />
      ) : (
        data && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{t('totalTips')}</CardTitle>
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
                  <CardTitle className="text-sm text-muted-foreground">
                    {t('grossAmount')}
                  </CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatCurrency(data.totalAmount, 'usd', locale)}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{t('netAmount')}</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatCurrency(data.netAmount, 'usd', locale)}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{t('averageTip')}</CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatCurrency(data.averageTip, 'usd', locale)}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {t('averageRating')}
                  </CardTitle>
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
                      {data.ratedTipCount}{' '}
                      {data.ratedTipCount !== 1 ? t('ratedTipsPlural') : t('ratedTips')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Revenue Over Time — Area Chart */}
            {dateData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('revenueOverTime')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dateData}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tickFormatter={(v) => `$${v}`}
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <Tooltip content={<RevenueTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Tips by Room (Bar) + Staff Distribution (Pie) */}
            <div className="grid gap-8 md:grid-cols-2">
              {topRooms.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('tipsByRoom')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topRooms}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="roomNumber"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tickFormatter={(v) => `$${v}`}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip content={<RoomTooltip />} />
                        <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {staffPieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('staffDistribution')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={staffPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                          label={renderPieLabel}
                        >
                          {staffPieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value, 'usd', locale)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Rating Distribution */}
            {data.ratingDistribution && data.ratingDistribution.some((r) => r.count > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('ratingDistribution')}</CardTitle>
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

            {/* Detailed Staff List */}
            {data.tipsByStaff && data.tipsByStaff.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('tipsByStaff')}</CardTitle>
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
                              {s.count} {s.count !== 1 ? t('ratedTipsPlural') : t('tips')}
                              {s.averageRating != null && (
                                <span className="ml-2">
                                  {s.averageRating}/5
                                  <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400 ml-0.5 -mt-0.5" />
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium">
                          {formatCurrency(s.total, 'usd', locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Room List */}
            <Card>
              <CardHeader>
                <CardTitle>{t('tipsByRoomDetail')}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.tipsByRoom.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title={t('noDataForPeriod')}
                    description={t('adjustDateRange')}
                  />
                ) : (
                  <div className="space-y-1">
                    {data.tipsByRoom.map((r) => (
                      <div
                        key={r.roomNumber}
                        className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                      >
                        <span>{r.roomNumber}</span>
                        <span className="font-medium">
                          {formatCurrency(r.total, 'usd', locale)} ({r.count})
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
