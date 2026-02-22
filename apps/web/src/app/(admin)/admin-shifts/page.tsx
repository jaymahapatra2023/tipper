'use client';

import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type {
  ShiftView,
  OnShiftNowEntry,
  ShiftTemplateView,
  ShiftSwapRequestView,
} from '@tipper/shared';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface StaffOption {
  id: string;
  name: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
}

type Tab = 'shifts' | 'templates' | 'swaps';

function statusBadge(status: string, t: any) {
  const map: Record<string, { variant: any; label: string }> = {
    scheduled: { variant: 'secondary', label: t('scheduled') },
    in_progress: { variant: 'warning', label: t('inProgress') },
    completed: { variant: 'success', label: t('completed') },
    cancelled: { variant: 'destructive', label: t('cancelled') },
  };
  const { variant, label } = map[status] ?? { variant: 'outline', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminShiftsPage() {
  const t = useTranslations('shifts');
  const tc = useTranslations('common');

  const [tab, setTab] = useState<Tab>('shifts');
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<ShiftView[]>([]);
  const [onShiftNow, setOnShiftNow] = useState<OnShiftNowEntry[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplateView[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwapRequestView[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [roomList, setRoomList] = useState<RoomOption[]>([]);

  // Date navigator
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Create shift form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    staffMemberId: '',
    startTime: '',
    endTime: '',
    roomIds: [] as string[],
    notes: '',
  });

  // Template form
  const [showTemplateCreate, setShowTemplateCreate] = useState(false);
  const [templateCreating, setTemplateCreating] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateEntries, setTemplateEntries] = useState<
    {
      staffMemberId: string;
      dayOfWeek: string;
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
      roomIds: string[];
    }[]
  >([]);

  // Apply template
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [applyStart, setApplyStart] = useState('');
  const [applyEnd, setApplyEnd] = useState('');

  useEffect(() => {
    loadStaffAndRooms();
  }, []);

  useEffect(() => {
    loadShifts();
  }, [selectedDate]);

  useEffect(() => {
    if (tab === 'templates') loadTemplates();
    if (tab === 'swaps') loadSwaps();
  }, [tab]);

  async function loadStaffAndRooms() {
    const [staffRes, roomRes] = await Promise.all([
      api.get<any[]>('/admin/staff'),
      api.get<any[]>('/admin/rooms'),
    ]);
    if (staffRes.success && staffRes.data) {
      setStaffList(
        staffRes.data.map((s: any) => ({ id: s.id, name: s.user?.name ?? s.name ?? '' })),
      );
    }
    if (roomRes.success && roomRes.data) {
      setRoomList(roomRes.data.map((r: any) => ({ id: r.id, roomNumber: r.roomNumber })));
    }
  }

  async function loadShifts() {
    setLoading(true);
    const [shiftsRes, onShiftRes] = await Promise.all([
      api.get<ShiftView[]>(`/shifts/admin?date=${selectedDate}`),
      api.get<OnShiftNowEntry[]>('/shifts/admin/on-shift-now'),
    ]);
    if (shiftsRes.success && shiftsRes.data) setShifts(shiftsRes.data);
    if (onShiftRes.success && onShiftRes.data) setOnShiftNow(onShiftRes.data);
    setLoading(false);
  }

  async function loadTemplates() {
    const res = await api.get<ShiftTemplateView[]>('/shifts/admin/templates');
    if (res.success && res.data) setTemplates(res.data);
  }

  async function loadSwaps() {
    const res = await api.get<ShiftSwapRequestView[]>('/shifts/admin/swaps');
    if (res.success && res.data) setSwaps(res.data);
  }

  async function handleCreateShift() {
    setCreating(true);
    const res = await api.post('/shifts/admin', form);
    if (res.success) {
      setShowCreate(false);
      setForm({ staffMemberId: '', startTime: '', endTime: '', roomIds: [], notes: '' });
      loadShifts();
    }
    setCreating(false);
  }

  async function handleCancelShift(id: string) {
    if (!confirm(t('cancelShiftConfirm'))) return;
    await api.delete(`/shifts/admin/${id}`);
    loadShifts();
  }

  async function handleCreateTemplate() {
    setTemplateCreating(true);
    const res = await api.post('/shifts/admin/templates', {
      name: templateName,
      entries: templateEntries,
    });
    if (res.success) {
      setShowTemplateCreate(false);
      setTemplateName('');
      setTemplateEntries([]);
      loadTemplates();
    }
    setTemplateCreating(false);
  }

  async function handleApplyTemplate(templateId: string) {
    const res = await api.post<{ created: number; skipped: number }>(
      `/shifts/admin/templates/${templateId}/apply`,
      { startDate: applyStart, endDate: applyEnd },
    );
    if (res.success && res.data) {
      alert(t('templateApplied', { created: res.data.created, skipped: res.data.skipped }));
      setApplyingTemplateId(null);
      loadShifts();
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm(t('deleteTemplateConfirm'))) return;
    await api.delete(`/shifts/admin/templates/${id}`);
    loadTemplates();
  }

  async function handleReviewSwap(id: string, status: 'approved' | 'rejected') {
    await api.put(`/shifts/admin/swaps/${id}/review`, { status });
    loadSwaps();
  }

  function navigateDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  }

  function toggleRoom(roomId: string) {
    setForm((prev) => ({
      ...prev,
      roomIds: prev.roomIds.includes(roomId)
        ? prev.roomIds.filter((id) => id !== roomId)
        : [...prev.roomIds, roomId],
    }));
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('desc')} />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(['shifts', 'templates', 'swaps'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {key === 'shifts'
              ? t('shiftsTab')
              : key === 'templates'
                ? t('templatesTab')
                : t('swapRequestsTab')}
          </button>
        ))}
      </div>

      {/* ═══════ SHIFTS TAB ═══════ */}
      {tab === 'shifts' && (
        <>
          {/* On Shift Now */}
          {onShiftNow.length > 0 && (
            <Card className="overflow-hidden card-hover border-emerald-200">
              <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  {t('onShiftNow')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {onShiftNow.map((entry) => (
                    <div
                      key={entry.shiftId}
                      className="flex flex-col gap-1.5 rounded-lg px-3 py-2 even:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{entry.staffName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)} |{' '}
                          {entry.rooms.map((r) => r.roomNumber).join(', ')}
                        </p>
                      </div>
                      <Badge variant="success" className="w-fit">
                        {t('inProgress')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date nav + actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
              <Button variant="outline" size="sm" onClick={() => navigateDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/shifts/admin/export/ical`}
                  download
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {t('exportCalendar')}
                </a>
              </Button>
              <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? (
                  <X className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                )}
                {showCreate ? tc('cancel') : t('createShift')}
              </Button>
            </div>
          </div>

          {/* Create shift form */}
          {showCreate && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t('staffMember')}</Label>
                    <select
                      className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.staffMemberId}
                      onChange={(e) => setForm({ ...form, staffMemberId: e.target.value })}
                    >
                      <option value="">{t('selectStaff')}</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>{t('rooms')}</Label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {roomList.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRoom(r.id)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            form.roomIds.includes(r.id)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {r.roomNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t('startTime')}</Label>
                    <Input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('endTime')}</Label>
                    <Input
                      type="datetime-local"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('notes')}</Label>
                  <Input
                    placeholder={t('notesPlaceholder')}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleCreateShift}
                  disabled={
                    creating ||
                    !form.staffMemberId ||
                    !form.startTime ||
                    !form.endTime ||
                    form.roomIds.length === 0
                  }
                >
                  {creating ? tc('saving') : t('createShift')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Shifts list */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <LoadingSpinner />
              ) : shifts.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title={t('noShifts')}
                  description={t('noShiftsHint')}
                />
              ) : (
                <div className="space-y-1">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex flex-col gap-2 rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{shift.staffName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(shift.startTime)} {formatTime(shift.startTime)} –{' '}
                          {formatTime(shift.endTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('rooms')}: {shift.rooms.map((r) => r.roomNumber).join(', ')}
                          {shift.notes && ` | ${shift.notes}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(shift.status, t)}
                        {shift.status === 'scheduled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelShift(shift.id)}
                          >
                            {t('cancelShift')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════ TEMPLATES TAB ═══════ */}
      {tab === 'templates' && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowTemplateCreate(!showTemplateCreate)}>
              {showTemplateCreate ? (
                <X className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              {showTemplateCreate ? tc('cancel') : t('createTemplate')}
            </Button>
          </div>

          {showTemplateCreate && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>{t('templateName')}</Label>
                  <Input
                    placeholder={t('templateNamePlaceholder')}
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('shiftsTab')}</Label>
                  {templateEntries.map((entry, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm"
                    >
                      <select
                        className="rounded border bg-background px-2 py-1 text-xs"
                        value={entry.staffMemberId}
                        onChange={(e) => {
                          const entries = [...templateEntries];
                          entries[i] = { ...entries[i], staffMemberId: e.target.value };
                          setTemplateEntries(entries);
                        }}
                      >
                        <option value="">{t('selectStaff')}</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded border bg-background px-2 py-1 text-xs"
                        value={entry.dayOfWeek}
                        onChange={(e) => {
                          const entries = [...templateEntries];
                          entries[i] = { ...entries[i], dayOfWeek: e.target.value };
                          setTemplateEntries(entries);
                        }}
                      >
                        {daysOfWeek.map((d) => (
                          <option key={d} value={d}>
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={entry.startHour}
                        onChange={(e) => {
                          const entries = [...templateEntries];
                          entries[i] = { ...entries[i], startHour: parseInt(e.target.value) || 0 };
                          setTemplateEntries(entries);
                        }}
                        className="w-16"
                        placeholder={t('start')}
                      />
                      <span className="text-xs text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={entry.startMinute}
                        onChange={(e) => {
                          const entries = [...templateEntries];
                          entries[i] = {
                            ...entries[i],
                            startMinute: parseInt(e.target.value) || 0,
                          };
                          setTemplateEntries(entries);
                        }}
                        className="w-16"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={entry.endHour}
                        onChange={(e) => {
                          const entries = [...templateEntries];
                          entries[i] = { ...entries[i], endHour: parseInt(e.target.value) || 0 };
                          setTemplateEntries(entries);
                        }}
                        className="w-16"
                        placeholder={t('end')}
                      />
                      <span className="text-xs text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={entry.endMinute}
                        onChange={(e) => {
                          const entries = [...templateEntries];
                          entries[i] = { ...entries[i], endMinute: parseInt(e.target.value) || 0 };
                          setTemplateEntries(entries);
                        }}
                        className="w-16"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setTemplateEntries(templateEntries.filter((_, j) => j !== i))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTemplateEntries([
                        ...templateEntries,
                        {
                          staffMemberId: '',
                          dayOfWeek: 'monday',
                          startHour: 8,
                          startMinute: 0,
                          endHour: 16,
                          endMinute: 0,
                          roomIds: [],
                        },
                      ])
                    }
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t('addEntry')}
                  </Button>
                </div>

                <Button
                  onClick={handleCreateTemplate}
                  disabled={templateCreating || !templateName || templateEntries.length === 0}
                >
                  {templateCreating ? tc('saving') : t('createTemplate')}
                </Button>
              </CardContent>
            </Card>
          )}

          {templates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={CalendarClock}
                  title={t('noTemplates')}
                  description={t('noTemplatesHint')}
                />
              </CardContent>
            </Card>
          ) : (
            templates.map((tmpl) => (
              <Card key={tmpl.id} className="overflow-hidden card-hover">
                <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">{tmpl.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setApplyingTemplateId(applyingTemplateId === tmpl.id ? null : tmpl.id)
                        }
                      >
                        {t('applyTemplate')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                      >
                        {t('deleteTemplate')}
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {tmpl.entries.length} {t('shiftsTab').toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {tmpl.entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 rounded px-3 py-1.5 even:bg-muted/30"
                      >
                        <span className="w-20 shrink-0 capitalize font-medium">{e.dayOfWeek}</span>
                        <span className="text-muted-foreground">
                          {String(e.startHour).padStart(2, '0')}:
                          {String(e.startMinute).padStart(2, '0')} –{' '}
                          {String(e.endHour).padStart(2, '0')}:
                          {String(e.endMinute).padStart(2, '0')}
                        </span>
                        <span>{e.staffName}</span>
                      </div>
                    ))}
                  </div>

                  {applyingTemplateId === tmpl.id && (
                    <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
                      <div>
                        <Label>{tc('startDate')}</Label>
                        <Input
                          type="date"
                          value={applyStart}
                          onChange={(e) => setApplyStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>{tc('endDate')}</Label>
                        <Input
                          type="date"
                          value={applyEnd}
                          onChange={(e) => setApplyEnd(e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!applyStart || !applyEnd}
                        onClick={() => handleApplyTemplate(tmpl.id)}
                      >
                        {tc('apply')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}

      {/* ═══════ SWAPS TAB ═══════ */}
      {tab === 'swaps' && (
        <Card>
          <CardContent className="pt-6">
            {swaps.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('noSwapRequests')}
                description={t('noSwapRequestsHint')}
              />
            ) : (
              <div className="space-y-1">
                {swaps.map((swap) => (
                  <div
                    key={swap.id}
                    className="flex flex-col gap-2 rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{swap.requesterName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(swap.originalShift.startTime)}{' '}
                        {formatTime(swap.originalShift.startTime)} –{' '}
                        {formatTime(swap.originalShift.endTime)}
                      </p>
                      {swap.targetStaffName && (
                        <p className="text-xs text-muted-foreground">
                          {t('targetStaff')}: {swap.targetStaffName}
                        </p>
                      )}
                      {swap.reason && (
                        <p className="text-xs text-muted-foreground">{swap.reason}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {swap.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => handleReviewSwap(swap.id, 'approved')}>
                            {t('approve')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReviewSwap(swap.id, 'rejected')}
                          >
                            {t('reject')}
                          </Button>
                        </>
                      ) : (
                        <Badge
                          variant={
                            swap.status === 'approved'
                              ? 'success'
                              : swap.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {swap.status === 'approved'
                            ? t('swapApproved')
                            : swap.status === 'rejected'
                              ? t('swapRejected')
                              : t('swapPending')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
