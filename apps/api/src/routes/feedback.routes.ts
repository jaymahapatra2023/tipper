import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  UserRole,
  feedbackCreateSchema,
  feedbackQuerySchema,
  feedbackUpdateSchema,
} from '@tipper/shared';
import type { FeedbackCreateInput, FeedbackQueryInput, FeedbackUpdateInput } from '@tipper/shared';

import { feedbackService } from '../services/feedback.service';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getClientIp } from '../utils/audit';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

router.use(authenticate);

// POST / — any non-guest authenticated user can submit feedback
router.post(
  '/',
  authorize(UserRole.STAFF, UserRole.HOTEL_ADMIN, UserRole.PLATFORM_ADMIN),
  validate(feedbackCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const feedback = await feedbackService.create(
        req.user!.userId,
        req.body as FeedbackCreateInput,
        getClientIp(req),
      );
      sendSuccess(res, feedback, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET / — admins can list feedback
router.get(
  '/',
  authorize(UserRole.HOTEL_ADMIN, UserRole.PLATFORM_ADMIN),
  validate(feedbackQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await feedbackService.list(req.query as unknown as FeedbackQueryInput);
      sendSuccess(res, result.feedback, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id — platform admin can update feedback status/priority
router.put(
  '/:id',
  authorize(UserRole.PLATFORM_ADMIN),
  validate(feedbackUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const feedback = await feedbackService.update(
        req.params.id as string,
        req.body as FeedbackUpdateInput,
        req.user!.userId,
        getClientIp(req),
      );
      sendSuccess(res, feedback);
    } catch (err) {
      next(err);
    }
  },
);

export { router as feedbackRoutes };
