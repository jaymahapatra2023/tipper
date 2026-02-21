'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, CalendarClock, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import type { ShiftView } from '@tipper/shared';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatShiftDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function shiftStatusBadge(status: string, ts: any) {
  const map: Record<string, { variant: any; label: string }> = {
    scheduled: { variant: 'secondary', label: ts('scheduled') },
    in_progress: { variant: 'warning', label: ts('inProgress') },
    completed: { variant: 'success', label: ts('completed') },
    cancelled: { variant: 'destructive', label: ts('cancelled') },
  };
  const { variant, label } = map[status] ?? { variant: 'outline', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export default function StaffAssignmentsPage() {
  const t = useTranslations('staff');
  const ts = useTranslations('shifts');
  const locale = useLocale();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [shifts, setShifts] = useState<ShiftView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [assignRes, shiftRes] = await Promise.all([
      api.get<Assignment[]>('/staff/assignments'),
      api.get<ShiftView[]>('/shifts/my-shifts'),
    ]);
    if (assignRes.success && assignRes.data) setAssignments(assignRes.data);
    if (shiftRes.success && shiftRes.data) setShifts(shiftRes.data);
    setLoading(false);
  }

  async function claimAssignment(id: string) {
    const res = await api.post(`/staff/assignments/${id}/claim`);
    if (res.success) loadData();
  }

  async function updateShiftStatus(shiftId: string, status: 'in_progress' | 'completed') {
    const res = await api.put(`/shifts/my-shifts/${shiftId}/status`, { status });
    if (res.success) loadData();
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('assignmentsTitle')} description={t('assignmentsDesc')} />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('assignmentsTitle')} description={t('assignmentsDesc')} />

      {/* My Shifts Section */}
      <Card className="overflow-hidden card-hover">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              {ts('myShifts')}
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/shifts/my-shifts/export/ical`}
                download
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {ts('exportCalendar')}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={ts('noMyShifts')}
              description={ts('noMyShiftsHint')}
            />
          ) : (
            <div className="space-y-1">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {formatShiftDate(shift.startTime)} {formatTime(shift.startTime)} –{' '}
                      {formatTime(shift.endTime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ts('rooms')}: {shift.rooms.map((r) => r.roomNumber).join(', ')}
                      {shift.notes && ` | ${shift.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {shiftStatusBadge(shift.status, ts)}
                    {shift.status === 'scheduled' && (
                      <Button size="sm" onClick={() => updateShiftStatus(shift.id, 'in_progress')}>
                        {ts('checkIn')}
                      </Button>
                    )}
                    {shift.status === 'in_progress' && (
                      <Button size="sm" onClick={() => updateShiftStatus(shift.id, 'completed')}>
                        {ts('checkOut')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Assignments Section */}
      <Card>
        <CardContent className="pt-6">
          {assignments.length === 0 ? (
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
