import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@tipper/shared';

import { staffService } from '../services/staff.service';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

router.use(authenticate, authorize(UserRole.STAFF));

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.getDashboard(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/tips', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await staffService.getTips(req.user!.userId, page, limit);
    sendSuccess(res, result.tips, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.getAssignments(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/assignments/:id/claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.claimAssignment(req.user!.userId, req.params.id as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.put('/pool-opt-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.updatePoolOptIn(req.user!.userId, req.body.optIn);
    sendSuccess(res, { poolOptIn: result.poolOptIn });
  } catch (err) {
    next(err);
  }
});

// Stripe Connect
router.post('/stripe/onboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const returnUrl = req.body.returnUrl || process.env.NEXT_PUBLIC_APP_URL + '/staff-settings';
    const result = await staffService.createStripeOnboardingLink(req.user!.userId, returnUrl);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/stripe/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.getStripeOnboardingStatus(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.getPerformance(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/payouts/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.getPayoutSummary(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/payouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await staffService.getPayouts(req.user!.userId, page, limit);
    sendSuccess(res, result.payouts, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (err) {
    next(err);
  }
});

export { router as staffRoutes };
