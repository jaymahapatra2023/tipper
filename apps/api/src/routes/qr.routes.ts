import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { qrService } from '../services/qr.service';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await qrService.resolve(req.params.code as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

export { router as qrRoutes };
