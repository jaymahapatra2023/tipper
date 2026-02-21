'use client';

import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface Assignment {
  id: string;
  assignedDate: string;
  isClaimed: boolean;
  room: { roomNumber: string; floor: number };
}

export default function StaffAssignmentsPage() {
  const t = useTranslations('staff');
  const locale = useLocale();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    setLoading(true);
    const res = await api.get<Assignment[]>('/staff/assignments');
    if (res.success && res.data) setAssignments(res.data);
    setLoading(false);
  }

  async function claimAssignment(id: string) {
    const res = await api.post(`/staff/assignments/${id}/claim`);
    if (res.success) loadAssignments();
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('assignmentsTitle')} description={t('assignmentsDesc')} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={t('noAssignments')}
              description={t('assignmentsHint')}
            />
          ) : (
            <div className="space-y-1">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {t('room')} {a.room.roomNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Floor {a.room.floor} - {formatDate(a.assignedDate, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.isClaimed ? (
                      <Badge variant="success">{t('claimed')}</Badge>
                    ) : (
                      <Button size="sm" onClick={() => claimAssignment(a.id)}>
                        {t('claim')}
                      </Button>
                    )}
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
