'use client';

import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface TipItem {
  id: string;
  roomNumber: string;
  amount: number;
  message?: string;
  date: string;
  tipMethod: string;
}

export default function StaffTipsPage() {
  const [tips, setTips] = useState<TipItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<TipItem[]>(`/staff/tips?page=${page}&limit=20`).then((res) => {
      if (res.success && res.data) {
        setTips(res.data);
        setTotal(res.meta?.total || 0);
      }
      setLoading(false);
    });
  }, [page]);

  return (
    <div className="space-y-8">
      <PageHeader title="My Tips" description="View your complete tip history" />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : tips.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No tips received yet"
              description="Your tip history will appear here"
            />
          ) : (
            <>
              <div className="space-y-1">
                {tips.map((tip) => (
                  <div
                    key={tip.id}
                    className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">Room {tip.roomNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tip.date)} - {tip.tipMethod === 'per_day' ? 'Per Day' : 'Flat'}
                      </p>
                      {tip.message && (
                        <p className="text-sm italic mt-1">&quot;{tip.message}&quot;</p>
                      )}
                    </div>
                    <Badge variant="success">{formatCurrency(tip.amount)}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * 20 >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
