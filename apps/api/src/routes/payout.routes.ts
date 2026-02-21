import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@tipper/shared';

import { payoutService } from '../services/payout.service';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

router.use(authenticate, authorize(UserRole.PLATFORM_ADMIN));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const result = await payoutService.getAllPayouts(page, limit, status);
    sendSuccess(res, result.payouts, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await payoutService.getPayoutAnalytics();
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/process', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await payoutService.processPayouts();
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await payoutService.retryPayout(req.params.id as string);
    sendSuccess(res, { message: 'Payout retry initiated' });
  } catch (err) {
    next(err);
  }
});

export { router as payoutRoutes };
