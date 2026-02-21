'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, DollarSign, TrendingUp, DoorOpen, ArrowRight, Clock } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminAnalytics, OnShiftNowEntry } from '@tipper/shared';
import { Badge } from '@/components/ui/badge';

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

interface HotelInfo {
  id: string;
  name: string;
  status: string;
  onboardingStep: number;
  stripeOnboarded: boolean;
}

function DashboardSkeleton() {
  const t = useTranslations('admin');
  return (
    <div className="space-y-8">
      <PageHeader title={t('dashboardTitle')} description={t('dashboardDesc')} />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniTooltip({
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
    <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {payload[0].payload.count} {t('tips')}
      </p>
      <p className="font-semibold text-emerald-600">
        {formatCurrency(payload[0].value, 'usd', locale)}
      </p>
    </div>
  );
}

function RoomBarTooltip({
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
    <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
      <p className="font-medium">{d.roomNumber}</p>
      <p className="text-muted-foreground">
        {d.count} {t('tips')}
      </p>
      <p className="font-semibold text-emerald-600">
        {formatCurrency(payload[0].value, 'usd', locale)}
      </p>
    </div>
  );
}

function StaffBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { staffName: string; count: number } }[];
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
      <p className="font-medium">{d.staffName}</p>
      <p className="text-muted-foreground">
        {d.count} {t('tips')}
      </p>
      <p className="font-semibold text-emerald-600">
        {formatCurrency(payload[0].value, 'usd', locale)}
      </p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const ts = useTranslations('shifts');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [hotel, setHotel] = useState<HotelInfo | null>(null);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const [onShiftNow, setOnShiftNow] = useState<OnShiftNowEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<AdminAnalytics>('/admin/analytics/overview'),
      api.get<HotelInfo>('/admin/hotel'),
      api.get<{ id: string }[]>('/admin/staff'),
      api.get<{ id: string }[]>('/admin/rooms'),
      api.get<OnShiftNowEntry[]>('/shifts/admin/on-shift-now'),
    ]).then(([analyticsRes, hotelRes, staffRes, roomsRes, onShiftRes]) => {
      if (analyticsRes.success && analyticsRes.data) setAnalytics(analyticsRes.data);
      if (hotelRes.success && hotelRes.data) setHotel(hotelRes.data);
      if (staffRes.success && staffRes.data) setStaffCount(staffRes.data.length);
      if (roomsRes.success && roomsRes.data) setRoomCount(roomsRes.data.length);
      if (onShiftRes.success && onShiftRes.data) setOnShiftNow(onShiftRes.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <DashboardSkeleton />;

  const showSetupBanner = (hotel?.onboardingStep ?? 0) < 5;

  const dateData =
    analytics?.tipsByDate?.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })) ?? [];

  const topRooms =
    analytics?.tipsByRoom
      ?.slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 8) ?? [];

  const staffData = analytics?.tipsByStaff ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title={t('dashboardTitle')} description={t('dashboardDesc')} />

      {showSetupBanner && (
        <Link href="/admin-onboarding">
          <Card className="overflow-hidden border-primary/30 bg-primary/5 cursor-pointer transition-colors hover:bg-primary/10">
            <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{t('continueSetup')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('setupStep', { current: (hotel?.onboardingStep ?? 0) + 1, total: 5 })}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalTips')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{analytics?.totalTips || 0}</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalAmount')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(analytics?.totalAmount || 0, 'usd', locale)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('averageTip')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(analytics?.averageTip || 0, 'usd', locale)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('roomsWithTips')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <DoorOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {analytics?.tipsByRoom?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* On Shift Now Widget */}
      {onShiftNow.length > 0 && (
        <Card className="overflow-hidden card-hover border-emerald-200">
          <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-emerald-600" />
              {ts('onShiftNow')}
              <Badge variant="success" className="ml-1">
                {onShiftNow.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {onShiftNow.map((entry) => (
                <div
                  key={entry.shiftId}
                  className="flex items-center justify-between rounded-lg px-3 py-2 even:bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-sm">{entry.staffName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.rooms.map((r) => r.roomNumber).join(', ')}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(entry.endTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Trend — Compact Area Chart */}
      {dateData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('revenueTrend')}</CardTitle>
            <Link href="/admin-analytics" className="text-sm text-primary hover:underline">
              {t('viewAnalytics')}
            </Link>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dateData}>
                <defs>
                  <linearGradient id="dashRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  width={50}
                />
                <Tooltip content={<MiniTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#dashRevenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tips by Room (Bar Chart) + Tips by Staff (Horizontal Bar Chart) */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('tipsByRoom')}</CardTitle>
          </CardHeader>
          <CardContent>
            {topRooms.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topRooms}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="roomNumber"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    width={50}
                  />
                  <Tooltip content={<RoomBarTooltip />} />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={DoorOpen}
                title={t('noRoomDataYet')}
                description={t('tipsWillAppear')}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('tipsByStaff')}</CardTitle>
          </CardHeader>
          <CardContent>
            {staffData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={staffData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="staffName"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    width={100}
                  />
                  <Tooltip content={<StaffBarTooltip />} />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title={t('noStaffDataYet')}
                description={t('staffTipTotals')}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
