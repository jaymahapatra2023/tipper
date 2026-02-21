'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Clock, TrendingUp, DoorOpen, Receipt, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import type { StaffDashboard } from '@tipper/shared';

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('staff');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<StaffDashboard>('/staff/dashboard').then((res) => {
      if (res.success && res.data) setDashboard(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!dashboard) {
    return <div className="text-center text-muted-foreground">{tc('failedToLoad')}</div>;
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('dashboardTitle', { name: firstName })}
        </h1>
        <p className="text-muted-foreground mt-1">{t('dashboardDesc')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="overflow-hidden border-primary/20 bg-primary/5 card-hover">
          <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalEarnings')}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(dashboard.totalEarnings, 'usd', locale)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('thisMonth')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(dashboard.periodEarnings, 'usd', locale)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('avgRating')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
              <Star className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {dashboard.averageRating != null
                ? `${Math.round(dashboard.averageRating * 10) / 10}/5`
                : 'N/A'}
            </p>
            {dashboard.ratedTipCount != null && dashboard.ratedTipCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                from {dashboard.ratedTipCount} rated tip{dashboard.ratedTipCount !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tc('pending')} {t('assignmentsTitle')}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{dashboard.pendingAssignments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentTips')}</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.recentTips.length === 0 ? (
            <EmptyState icon={Receipt} title={t('noTipsYet')} description={t('tipsWillAppear')} />
          ) : (
            <div className="space-y-1">
              {dashboard.recentTips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {t('room')} {tip.roomNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tip.date, locale)}
                      </p>
                      {tip.message && (
                        <p className="text-sm italic mt-1">&quot;{tip.message}&quot;</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tip.rating != null && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s <= tip.rating!
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/20'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <Badge variant="success">{formatCurrency(tip.amount, 'usd', locale)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
