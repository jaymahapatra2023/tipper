import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { UserRole, notificationQuerySchema } from '@tipper/shared';
import type { NotificationQueryInput } from '@tipper/shared';

import { notificationService } from '../services/notification.service';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

router.use(authenticate, authorize(UserRole.STAFF, UserRole.HOTEL_ADMIN, UserRole.PLATFORM_ADMIN));

// GET / — list notifications for the current user
router.get(
  '/',
  validate(notificationQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, unreadOnly } = req.query as unknown as NotificationQueryInput;
      const result = await notificationService.list(req.user!.userId, { page, limit, unreadOnly });
      sendSuccess(res, result.notifications, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /unread-count — get unread notification count
router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.unreadCount(req.user!.userId);
    sendSuccess(res, { count });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/read — mark a single notification as read
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markRead(req.params.id as string, req.user!.userId);
    sendSuccess(res, { success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /read-all — mark all notifications as read
router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllRead(req.user!.userId);
    sendSuccess(res, { success: true });
  } catch (err) {
    next(err);
  }
});

export { router as notificationRoutes };
