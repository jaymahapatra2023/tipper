import { prisma } from '@tipper/database';
import type { AuditLogQueryInput } from '@tipper/shared';
import { generateCsv } from '../utils/csv';

class AuditLogService {
  async getLogs(filters: AuditLogQueryInput, scopeUserIds?: string[]) {
    const where = this.buildWhere(filters, scopeUserIds);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getFilterOptions(scopeUserIds?: string[]) {
    const where = scopeUserIds ? { userId: { in: scopeUserIds } } : {};

    const [actions, entityTypes] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
      prisma.auditLog.findMany({
        where,
        select: { entityType: true },
        distinct: ['entityType'],
        orderBy: { entityType: 'asc' },
      }),
    ]);

    return {
      actions: actions.map((a) => a.action),
      entityTypes: entityTypes.map((e) => e.entityType),
    };
  }

  async exportCsv(filters: AuditLogQueryInput, scopeUserIds?: string[]) {
    const where = this.buildWhere(filters, scopeUserIds);

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Date',
      'User',
      'Email',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'Details',
    ];

    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.name || '',
      log.user?.email || '',
      log.action,
      log.entityType,
      log.entityId || '',
      log.ipAddress || '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);

    return generateCsv(headers, rows);
  }

  private buildWhere(filters: AuditLogQueryInput, scopeUserIds?: string[]) {
    const where: Record<string, unknown> = {};

    if (scopeUserIds) {
      where.userId = { in: scopeUserIds };
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entityType: { contains: filters.search, mode: 'insensitive' } },
        { ipAddress: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
      if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
      where.createdAt = dateFilter;
    }

    return where;
  }
}

export const auditLogService = new AuditLogService();
