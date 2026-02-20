'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminAnalytics } from '@tipper/shared';

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AdminAnalytics>('/admin/analytics/overview').then((res) => {
      if (res.success && res.data) setAnalytics(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Hotel Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics?.totalTips || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(analytics?.totalAmount || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(analytics?.averageTip || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rooms with Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics?.tipsByRoom?.length || 0}</p>
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
              <div className="space-y-3">
                {analytics.tipsByRoom.slice(0, 10).map((r) => (
                  <div key={r.roomNumber} className="flex justify-between items-center">
                    <span>Room {r.roomNumber}</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(r.total)}</span>
                      <span className="text-sm text-muted-foreground ml-2">({r.count} tips)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tips by Staff</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.tipsByStaff?.length ? (
              <div className="space-y-3">
                {analytics.tipsByStaff.map((s) => (
                  <div key={s.staffName} className="flex justify-between items-center">
                    <span>{s.staffName}</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(s.total)}</span>
                      <span className="text-sm text-muted-foreground ml-2">({s.count} tips)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
