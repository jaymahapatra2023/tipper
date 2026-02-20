'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffCreateSchema, type StaffCreateInput } from '@tipper/shared';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface StaffMember {
  id: string;
  isActive: boolean;
  poolOptIn: boolean;
  user: { id: string; email: string; name: string };
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<StaffCreateInput>({
    resolver: zodResolver(staffCreateSchema),
  });

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    const res = await api.get<StaffMember[]>('/admin/staff');
    if (res.success && res.data) setStaff(res.data);
    setLoading(false);
  }

  async function onSubmit(data: StaffCreateInput) {
    const res = await api.post('/admin/staff', data);
    if (res.success) {
      form.reset();
      setShowForm(false);
      loadStaff();
    }
  }

  async function deactivateStaff(id: string) {
    const res = await api.delete(`/admin/staff/${id}`);
    if (res.success) loadStaff();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add Staff'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Staff Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...form.register('name')} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register('email')} />
                </div>
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Adding...' : 'Add Staff Member'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : staff.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No staff members</p>
          ) : (
            <div className="space-y-4">
              {staff.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{s.user.name}</p>
                    <p className="text-sm text-muted-foreground">{s.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.isActive ? 'success' : 'secondary'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {s.isActive && (
                      <Button variant="outline" size="sm" onClick={() => deactivateStaff(s.id)}>
                        Deactivate
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
