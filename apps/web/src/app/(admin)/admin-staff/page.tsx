'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users, Weight } from 'lucide-react';
import { staffCreateSchema, type StaffCreateInput, POOL_WEIGHT_PRESETS } from '@tipper/shared';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface StaffMember {
  id: string;
  isActive: boolean;
  poolOptIn: boolean;
  poolWeight: number;
  user: { id: string; email: string; name: string };
}

interface HotelInfo {
  poolingEnabled: boolean;
  poolingType: string | null;
}

export default function AdminStaffPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [hotel, setHotel] = useState<HotelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<string | null>(null);
  const [weightValue, setWeightValue] = useState<number>(1.0);

  const isWeighted = hotel?.poolingEnabled && hotel?.poolingType === 'weighted';

  const form = useForm<StaffCreateInput>({
    resolver: zodResolver(staffCreateSchema),
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [staffRes, hotelRes] = await Promise.all([
      api.get<StaffMember[]>('/admin/staff'),
      api.get<HotelInfo>('/admin/hotel'),
    ]);
    if (staffRes.success && staffRes.data) setStaff(staffRes.data);
    if (hotelRes.success && hotelRes.data) setHotel(hotelRes.data);
    setLoading(false);
  }

  async function loadStaff() {
    const res = await api.get<StaffMember[]>('/admin/staff');
    if (res.success && res.data) setStaff(res.data);
  }

  async function updateWeight(staffMemberId: string, poolWeight: number) {
    const res = await api.put<StaffMember>(`/admin/staff/${staffMemberId}/weight`, { poolWeight });
    if (res.success) {
      setStaff((prev) => prev.map((s) => (s.id === staffMemberId ? { ...s, poolWeight } : s)));
      setEditingWeight(null);
    }
  }

  async function onSubmit(data: StaffCreateInput) {
    const res = await api.post('/admin/staff', data);
    if (res.success) {
      form.reset();
      setShowForm(false);
      loadStaff();
    }
  }

  async function resetPassword(userId: string) {
    if (!confirm(t('resetPasswordConfirm'))) return;
    setResettingPassword(userId);
    const res = await api.post(`/admin/staff/${userId}/reset-password`);
    if (res.success) {
      alert(t('passwordResetSent'));
    }
    setResettingPassword(null);
  }

  async function deactivateStaff(id: string) {
    const res = await api.delete(`/admin/staff/${id}`);
    if (res.success) loadStaff();
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('staffTitle')} description={t('staffDesc')}>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? tc('cancel') : t('addStaff')}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('addStaffMember')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">{tc('name')}</Label>
                  <Input id="name" {...form.register('name')} />
                </div>
                <div>
                  <Label htmlFor="email">{tc('email')}</Label>
                  <Input id="email" type="email" {...form.register('email')} />
                </div>
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('adding') : t('addStaffMember')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : staff.length === 0 ? (
            <EmptyState icon={Users} title={t('noStaffMembers')} description={t('addFirstStaff')}>
              <Button onClick={() => setShowForm(true)}>{t('addStaff')}</Button>
            </EmptyState>
          ) : (
            <div className="space-y-1">
              {staff.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{s.user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isWeighted &&
                      s.isActive &&
                      (editingWeight === s.id ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Input
                            type="number"
                            min={0.1}
                            max={10}
                            step={0.25}
                            value={weightValue}
                            onChange={(e) => setWeightValue(parseFloat(e.target.value) || 1.0)}
                            className="w-20 h-8 text-sm"
                          />
                          {POOL_WEIGHT_PRESETS.map((p) => (
                            <Button
                              key={p.label}
                              variant={weightValue === p.weight ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => setWeightValue(p.weight)}
                            >
                              {p.label}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            className="h-7"
                            onClick={() => updateWeight(s.id, weightValue)}
                          >
                            {tc('save')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            onClick={() => setEditingWeight(null)}
                          >
                            {tc('cancel')}
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => {
                            setEditingWeight(s.id);
                            setWeightValue(s.poolWeight);
                          }}
                        >
                          <Weight className="mr-1 h-3 w-3" />
                          {s.poolWeight}x
                        </Badge>
                      ))}
                    <Badge variant={s.isActive ? 'success' : 'secondary'}>
                      {s.isActive ? tc('active') : tc('inactive')}
                    </Badge>
                    {s.isActive && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetPassword(s.user.id)}
                          disabled={resettingPassword === s.user.id}
                        >
                          {resettingPassword === s.user.id ? t('resettingPw') : t('resetPassword')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deactivateStaff(s.id)}>
                          {t('deactivate')}
                        </Button>
                      </>
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
