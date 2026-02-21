import { prisma } from '@tipper/database';
import type { Prisma } from '@tipper/database';

export function logAudit(params: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): void {
  prisma.auditLog
    .create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: params.ipAddress,
      },
    })
    .catch((err) => {
      console.error('Failed to write audit log:', err);
    });
}

export function getClientIp(req: { ip?: string }): string | undefined {
  return req.ip;
}
