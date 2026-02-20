'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StaffSettingsPage() {
  const { user } = useAuth();
  const [poolOptIn, setPoolOptIn] = useState(false);

  async function togglePoolOptIn() {
    const newValue = !poolOptIn;
    const res = await api.put('/staff/pool-opt-in', { optIn: newValue });
    if (res.success) setPoolOptIn(newValue);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="text-muted-foreground">Name:</span> {user?.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {user?.email}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tip Pooling</CardTitle>
          <CardDescription>
            When enabled, tips for the hotel are shared among all opted-in staff members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Participate in tip pooling</span>
            <Button variant={poolOptIn ? 'default' : 'outline'} onClick={togglePoolOptIn}>
              {poolOptIn ? 'Opted In' : 'Opt In'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Account</CardTitle>
          <CardDescription>Connect your bank account to receive payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Set Up Payouts with Stripe</Button>
        </CardContent>
      </Card>
    </div>
  );
}
