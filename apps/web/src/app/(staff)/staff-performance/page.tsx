'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Hash,
  Receipt,
  Star,
  Award,
  Crown,
  Gem,
  Flame,
  ThumbsUp,
  Trophy,
  CheckCircle2,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import type { StaffPerformanceResponse, StaffMilestone, LeaderboardEntry } from '@tipper/shared';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Star,
  TrendingUp,
  Award,
  Crown,
  DollarSign,
  Gem,
  Flame,
  ThumbsUp,
};

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}
      {value}%
    </span>
  );
}

function MilestoneCard({ milestone }: { milestone: StaffMilestone }) {
  const Icon = ICON_MAP[milestone.icon] || Award;
  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${
        milestone.achieved ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      {milestone.achieved && (
        <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />
      )}
      <div
        className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${
          milestone.achieved ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-medium text-sm">{milestone.label}</p>
      <p className="text-xs text-muted-foreground mb-2">{milestone.description}</p>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${milestone.achieved ? 'bg-primary' : 'bg-primary/40'}`}
          style={{ width: `${milestone.progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{milestone.progress}%</p>
    </div>
  );
}

function LeaderboardSection({
  entries,
  t,
  locale,
}: {
  entries: LeaderboardEntry[];
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {t('leaderboard')}
        </CardTitle>
        <CardDescription>{t('leaderboardDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors ${
                entry.isCurrentUser
                  ? 'border border-primary/30 bg-primary/5'
                  : 'even:bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    entry.rank === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : entry.rank === 2
                        ? 'bg-gray-100 text-gray-600'
                        : entry.rank === 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {entry.rank}
                </div>
                <div>
                  <p className="font-medium">
                    {entry.staffName}
                    {entry.isCurrentUser && (
                      <span className="ml-2 text-xs text-primary">({t('you')})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.tipCount} tip{entry.tipCount !== 1 ? 's' : ''}
                    {entry.averageRating != null && (
                      <> · {Math.round(entry.averageRating * 10) / 10} avg</>
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="success">{formatCurrency(entry.totalEarnings, 'usd', locale)}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  locale?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-primary">{formatCurrency(payload[0].value, 'usd', locale)}</p>
    </div>
  );
}

export default function StaffPerformancePage() {
  const t = useTranslations('staff');
  const locale = useLocale();
  const [data, setData] = useState<StaffPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<StaffPerformanceResponse>('/staff/performance').then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data)
    return <div className="text-center text-muted-foreground">{t('failedToLoadPerformance')}</div>;

  const { metrics, leaderboard } = data;

  return (
    <div className="space-y-8">
      <PageHeader title={t('performanceTitle')} description={t('performanceDesc')} />

      {/* Metrics cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="overflow-hidden card-hover">
          <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('thisWeekMetric')}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">
              {formatCurrency(metrics.thisWeekEarnings, 'usd', locale)}
            </p>
            <TrendBadge value={metrics.weekTrend} />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('thisMonthMetric')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">
              {formatCurrency(metrics.thisMonthEarnings, 'usd', locale)}
            </p>
            <TrendBadge value={metrics.monthTrend} />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalTipsMetric')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Hash className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{metrics.tipCount}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.totalEarnings, 'usd', locale)} {t('total')}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('averageTipMetric')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">
              {formatCurrency(metrics.averageTip, 'usd', locale)}
            </p>
            {metrics.averageRating != null && (
              <p className="text-xs text-muted-foreground">
                {Math.round(metrics.averageRating * 10) / 10}/5 {t('avgRating')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Earnings chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('earningsLast30')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.dailyData}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <Tooltip content={<ChartTooltip locale={locale} />} />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="hsl(var(--primary))"
                  fill="url(#earningsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t('milestones')}
          </CardTitle>
          <CardDescription>{t('milestonesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.milestones.map((m) => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <LeaderboardSection entries={leaderboard} t={t} locale={locale} />
      )}
    </div>
  );
}
