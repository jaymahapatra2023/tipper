'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Assignment {
  id: string;
  assignedDate: string;
  isClaimed: boolean;
  room: { roomNumber: string; floor: number };
}

export default function StaffAssignmentsPage() {
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Room Assignments</h1>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No assignments</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">Room {a.room.roomNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Floor {a.room.floor} - {formatDate(a.assignedDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.isClaimed ? (
                      <Badge variant="success">Claimed</Badge>
                    ) : (
                      <Button size="sm" onClick={() => claimAssignment(a.id)}>
                        Claim
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
