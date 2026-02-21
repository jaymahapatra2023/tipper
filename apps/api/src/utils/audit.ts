import { prisma } from '@tipper/database';
import type { Prisma } from '@tipper/database';

interface AuditParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

function buildData(params: AuditParams) {
  return {
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
    ipAddress: params.ipAddress,
  };
}

/** Fire-and-forget audit log — for non-critical operations */
export function logAudit(params: AuditParams): void {
  prisma.auditLog.create({ data: buildData(params) }).catch((err) => {
    console.error('Failed to write audit log:', err);
  });
}

/** Awaitable audit log with retry — for critical operations (payments, auth) */
export async function logAuditAsync(params: AuditParams, retries = 2): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await prisma.auditLog.create({ data: buildData(params) });
      return;
    } catch (err) {
      if (attempt === retries) {
        console.error('Failed to write critical audit log after retries:', err);
      }
    }
  }
}

export function getClientIp(req: { ip?: string }): string | undefined {
  return req.ip;
}
