'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, DollarSign, TrendingUp, DoorOpen, CheckCircle, Circle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import type { AdminAnalytics } from '@tipper/shared';

interface HotelInfo {
  id: string;
  name: string;
  status: string;
  stripeOnboarded: boolean;
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [hotel, setHotel] = useState<HotelInfo | null>(null);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<AdminAnalytics>('/admin/analytics/overview'),
      api.get<HotelInfo>('/admin/hotel'),
      api.get<{ id: string }[]>('/admin/staff'),
      api.get<{ id: string }[]>('/admin/rooms'),
    ]).then(([analyticsRes, hotelRes, staffRes, roomsRes]) => {
      if (analyticsRes.success && analyticsRes.data) setAnalytics(analyticsRes.data);
      if (hotelRes.success && hotelRes.data) setHotel(hotelRes.data);
      if (staffRes.success && staffRes.data) setStaffCount(staffRes.data.length);
      if (roomsRes.success && roomsRes.data) setRoomCount(roomsRes.data.length);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  const showSetupWizard = hotel?.status === 'pending';

  return (
    <div className="space-y-8">
      <PageHeader title="Hotel Dashboard" description="Overview of your hotel's tipping activity" />

      {showSetupWizard && (
        <Card className="overflow-hidden border-primary/30 bg-primary/5">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader>
            <CardTitle>Welcome! Complete your hotel setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  done: (roomCount ?? 0) > 0,
                  label: 'Add rooms',
                  href: '/admin-rooms',
                },
                {
                  done: (staffCount ?? 0) > 0,
                  label: 'Add staff members',
                  href: '/admin-staff',
                },
                {
                  done: hotel?.stripeOnboarded ?? false,
                  label: 'Connect Stripe to receive payments',
                  href: '/admin-settings',
                },
              ].map((step) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-primary/10"
                >
                  {step.done ? (
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={step.done ? 'text-muted-foreground line-through' : 'font-medium'}
                  >
                    {step.label}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tips</CardTitle>
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
              Total Amount
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(analytics?.totalAmount || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Tip</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {formatCurrency(analytics?.averageTip || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rooms with Tips
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

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tips by Room</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.tipsByRoom?.length ? (
              <div className="space-y-1">
                {analytics.tipsByRoom.slice(0, 10).map((r) => (
                  <div
                    key={r.roomNumber}
                    className="flex justify-between items-center rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                  >
                    <span>Room {r.roomNumber}</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(r.total)}</span>
                      <span className="text-sm text-muted-foreground ml-2">({r.count} tips)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={DoorOpen}
                title="No room data yet"
                description="Tips will appear here once guests start tipping"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tips by Staff</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.tipsByStaff?.length ? (
              <div className="space-y-1">
                {analytics.tipsByStaff.map((s) => (
                  <div
                    key={s.staffName}
                    className="flex justify-between items-center rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                  >
                    <span>{s.staffName}</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(s.total)}</span>
                      <span className="text-sm text-muted-foreground ml-2">({s.count} tips)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No staff data yet"
                description="Staff tip totals will appear here"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
