'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, Download, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';

interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

interface FilterOptions {
  actions: string[];
  entityTypes: string[];
}

function actionBadgeVariant(action: string): 'warning' | 'success' | 'destructive' | 'secondary' {
  if (action.toLowerCase().includes('password')) return 'warning';
  if (action.toLowerCase().includes('create')) return 'success';
  if (action.toLowerCase().includes('delete')) return 'destructive';
  return 'secondary';
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function truncateId(id: string | null): string {
  if (!id) return '-';
  return id.length > 12 ? id.slice(0, 12) + '...' : id;
}

export default function AdminAuditLogPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    actions: [],
    entityTypes: [],
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');

  const limit = 20;

  useEffect(() => {
    api.get<FilterOptions>('/admin/audit-logs/filters').then((res) => {
      if (res.success && res.data) setFilterOptions(res.data);
    });
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (action) params.set('action', action);
    if (search) params.set('search', search);

    const res = await api.get<AuditLogEntry[]>(`/admin/audit-logs?${params.toString()}`);
    if (res.success && res.data) {
      setLogs(res.data);
      setTotal(res.meta?.total || 0);
    }
    setLoading(false);
  }, [page, startDate, endDate, action, search]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function applyFilters() {
    setPage(1);
    loadLogs();
  }

  async function downloadExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (action) params.set('action', action);
      if (search) params.set('search', search);
      const blob = await api.downloadBlob(`/admin/audit-logs/export?${params.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // downloadBlob throws on non-ok
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('auditTitle')} description={t('auditDesc')} />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>{tc('startDate')}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{tc('endDate')}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label>{tc('action')}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="">{tc('allActions')}</option>
                {filterOptions.actions.map((a) => (
                  <option key={a} value={a}>
                    {formatAction(a)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{tc('search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={tc('search') + '...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={applyFilters}>{tc('search')}</Button>
            <Button variant="outline" disabled={exporting} onClick={downloadExport}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? tc('exporting') : tc('exportCsv')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingSpinner />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={t('noAuditEntries')}
              description={t('auditActivityRecorded')}
            />
          ) : (
            <>
              <div className="space-y-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors even:bg-muted/30 hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={actionBadgeVariant(log.action)}>
                          {formatAction(log.action)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{log.entityType}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {truncateId(log.entityId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{formatDate(log.createdAt, locale)}</span>
                        <span>{log.user?.name || 'System'}</span>
                        {log.ipAddress && (
                          <span className="font-mono text-xs">{log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-muted-foreground">
                  {tc('showing')} {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of{' '}
                  {total}
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
                    disabled={page * limit >= total}
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
