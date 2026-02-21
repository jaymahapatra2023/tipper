import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { UserRole, platformSettingsSchema, hotelApprovalSchema } from '@tipper/shared';

import { platformService } from '../services/platform.service';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

router.use(authenticate, authorize(UserRole.PLATFORM_ADMIN));

router.get('/hotels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
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
});

router.put('/hotels/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformService.approveHotel(req.params.id as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.put('/hotels/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformService.suspendHotel(req.params.id as string);
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
      const result = await platformService.updateSettings(req.body.defaultPlatformFeePercent);
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
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

export { router as platformRoutes };
