import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { tipService } from '../services/tip.service';
import { validate } from '../middleware/validate';
import { tipLimiter } from '../middleware/rateLimiter';
import { sendSuccess } from '../utils/response';
import { tipCreateSchema, tipReceiptSchema, tipFeedbackSchema } from '@tipper/shared';

const router: Router = Router();

router.post(
  '/',
  tipLimiter,
  validate(tipCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tipService.createTip(req.body);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/receipt/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await tipService.getReceiptByToken(req.params.token as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/receipt/:token/feedback',
  validate(tipFeedbackSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tipService.submitFeedback(req.params.token as string, req.body);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await tipService.getTipStatus(req.params.id as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/receipt',
  validate(tipReceiptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await tipService.sendReceiptToEmail(req.params.id as string, req.body.email);
      sendSuccess(res, { message: 'Receipt sent successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export { router as tipRoutes };
