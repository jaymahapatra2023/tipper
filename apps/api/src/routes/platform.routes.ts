import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  UserRole,
  platformSettingsSchema,
  hotelApprovalSchema,
  auditLogQuerySchema,
  paginationSchema,
} from '@tipper/shared';
import type { AuditLogQueryInput } from '@tipper/shared';

import { platformService } from '../services/platform.service';
import { auditLogService } from '../services/audit-log.service';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getClientIp } from '../utils/audit';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

router.use(authenticate, authorize(UserRole.PLATFORM_ADMIN));

router.get(
  '/hotels',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const status = req.query.status as string | undefined;
      const result = await platformService.getHotels(page, limit, status);
      sendSuccess(res, result.hotels, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put('/hotels/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformService.approveHotel(
      req.params.id as string,
      req.user!.userId,
      getClientIp(req),
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.put('/hotels/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformService.suspendHotel(
      req.params.id as string,
      req.user!.userId,
      getClientIp(req),
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformService.getAnalytics();
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformService.getSettings();
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/settings',
  validate(platformSettingsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await platformService.updateSettings(
        req.body.defaultPlatformFeePercent,
        req.user!.userId,
        getClientIp(req),
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/users/:id/reset-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await platformService.resetUserPassword(
        req.user!.userId,
        req.params.id as string,
        getClientIp(req),
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// Audit Logs
router.get(
  '/audit-logs',
  validate(auditLogQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query as unknown as AuditLogQueryInput;
      const result = await auditLogService.getLogs(filters);
      sendSuccess(res, result.logs, 200, {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/audit-logs/filters', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const options = await auditLogService.getFilterOptions();
    sendSuccess(res, options);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/audit-logs/export',
  validate(auditLogQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query as unknown as AuditLogQueryInput;
      const csv = await auditLogService.exportCsv(filters);

      const filename = `audit-log-export-${new Date().toISOString().split('T')[0]}.csv`;
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
);

export { router as platformRoutes };
