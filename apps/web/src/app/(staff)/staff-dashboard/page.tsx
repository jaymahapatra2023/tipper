'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StaffDashboard } from '@tipper/shared';

export default function StaffDashboardPage() {
  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<StaffDashboard>('/staff/dashboard').then((res) => {
      if (res.success && res.data) setDashboard(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!dashboard) {
    return <div className="text-center text-muted-foreground">Failed to load dashboard</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(dashboard.totalEarnings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(dashboard.periodEarnings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.pendingAssignments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tips</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.recentTips.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tips received yet</p>
          ) : (
            <div className="space-y-4">
              {dashboard.recentTips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">Room {tip.roomNumber}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(tip.date)}</p>
                    {tip.message && (
                      <p className="text-sm italic mt-1">&quot;{tip.message}&quot;</p>
                    )}
                  </div>
                  <Badge variant="success">{formatCurrency(tip.amount)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
