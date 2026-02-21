import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  UserRole,
  shiftCreateSchema,
  shiftUpdateSchema,
  shiftQuerySchema,
  shiftStatusUpdateSchema,
  templateCreateSchema,
  templateApplySchema,
  swapRequestSchema,
  swapRespondSchema,
  swapReviewSchema,
} from '@tipper/shared';

import { shiftService } from '../services/shift.service';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getClientIp } from '../utils/audit';
import { sendSuccess } from '../utils/response';
import { prisma } from '@tipper/database';
import { ForbiddenError } from '../utils/errors';

const router: Router = Router();

// ────── Helper to get hotelId from admin user ──────

async function getAdminHotelId(userId: string): Promise<string> {
  const admin = await prisma.hotelAdmin.findFirst({ where: { userId } });
  if (!admin) throw new ForbiddenError('Not a hotel admin');
  return admin.hotelId;
}

// ────── ADMIN ROUTES ──────

const adminRouter = Router();
adminRouter.use(authenticate, authorize(UserRole.HOTEL_ADMIN));

// List shifts
adminRouter.get(
  '/',
  validate(shiftQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotelId = await getAdminHotelId(req.user!.userId);
      const shifts = await shiftService.getShifts(hotelId, req.query as any);
      sendSuccess(res, shifts);
    } catch (err) {
      next(err);
    }
  },
);

// Create shift
adminRouter.post(
  '/',
  validate(shiftCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotelId = await getAdminHotelId(req.user!.userId);
      const shift = await shiftService.createShift(
        hotelId,
        req.body,
        req.user!.userId,
        getClientIp(req),
      );
      sendSuccess(res, shift, 201);
    } catch (err) {
      next(err);
    }
  },
);

// Update shift
adminRouter.put(
  '/:id',
  validate(shiftUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotelId = await getAdminHotelId(req.user!.userId);
      const shift = await shiftService.updateShift(
        hotelId,
        req.params.id as string,
        req.body,
        req.user!.userId,
        getClientIp(req),
      );
      sendSuccess(res, shift);
    } catch (err) {
      next(err);
    }
  },
);

// Cancel shift
adminRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = await getAdminHotelId(req.user!.userId);
    await shiftService.cancelShift(
      hotelId,
      req.params.id as string,
      req.user!.userId,
      getClientIp(req),
    );
    sendSuccess(res, { message: 'Shift cancelled' });
  } catch (err) {
    next(err);
  }
});

// On shift now
adminRouter.get('/on-shift-now', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = await getAdminHotelId(req.user!.userId);
    const entries = await shiftService.getOnShiftNow(hotelId);
    sendSuccess(res, entries);
  } catch (err) {
    next(err);
  }
});

// iCal export (admin)
adminRouter.get('/export/ical', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = await getAdminHotelId(req.user!.userId);
    const shifts = await shiftService.getShifts(hotelId, req.query as any);
    const ical = await shiftService.exportIcal(shifts);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=shifts.ics');
    res.send(ical);
  } catch (err) {
    next(err);
  }
});

// ────── TEMPLATE ROUTES ──────

adminRouter.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = await getAdminHotelId(req.user!.userId);
    const templates = await shiftService.getTemplates(hotelId);
    sendSuccess(res, templates);
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  '/templates',
  validate(templateCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotelId = await getAdminHotelId(req.user!.userId);
      const template = await shiftService.createTemplate(
        hotelId,
        req.body,
        req.user!.userId,
        getClientIp(req),
      );
      sendSuccess(res, template, 201);
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.delete('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = await getAdminHotelId(req.user!.userId);
    await shiftService.deleteTemplate(
      hotelId,
      req.params.id as string,
      req.user!.userId,
      getClientIp(req),
    );
    sendSuccess(res, { message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  '/templates/:id/apply',
  validate(templateApplySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotelId = await getAdminHotelId(req.user!.userId);
      const result = await shiftService.applyTemplate(
        hotelId,
        req.params.id as string,
        req.body,
        req.user!.userId,
        getClientIp(req),
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// ────── SWAP ROUTES (admin) ──────

adminRouter.get('/swaps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = await getAdminHotelId(req.user!.userId);
    const swaps = await shiftService.getSwapRequests(hotelId);
    sendSuccess(res, swaps);
  } catch (err) {
    next(err);
  }
});

adminRouter.put(
  '/swaps/:id/review',
  validate(swapReviewSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotelId = await getAdminHotelId(req.user!.userId);
      await shiftService.reviewSwap(
        hotelId,
        req.params.id as string,
        req.body.status,
        req.user!.userId,
        getClientIp(req),
      );
      sendSuccess(res, { message: `Swap request ${req.body.status}` });
    } catch (err) {
      next(err);
    }
  },
);

// ────── STAFF ROUTES ──────

const staffRouter = Router();
staffRouter.use(authenticate, authorize(UserRole.STAFF));

// My shifts
staffRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shifts = await shiftService.getStaffShifts(req.user!.userId);
    sendSuccess(res, shifts);
  } catch (err) {
    next(err);
  }
});

// Check in / check out
staffRouter.put(
  '/:id/status',
  validate(shiftStatusUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shift = await shiftService.updateShiftStatus(
        req.user!.userId,
        req.params.id as string,
        req.body.status,
      );
      sendSuccess(res, shift);
    } catch (err) {
      next(err);
    }
  },
);

// Request swap
staffRouter.post(
  '/swaps',
  validate(swapRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swap = await shiftService.requestSwap(
        req.user!.userId,
        req.body.originalShiftId,
        req.body.targetStaffId,
        req.body.reason,
      );
      sendSuccess(res, swap, 201);
    } catch (err) {
      next(err);
    }
  },
);

// My swap requests
staffRouter.get('/swaps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const swaps = await shiftService.getMySwapRequests(req.user!.userId);
    sendSuccess(res, swaps);
  } catch (err) {
    next(err);
  }
});

// Respond to swap
staffRouter.put(
  '/swaps/:id/respond',
  validate(swapRespondSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await shiftService.respondToSwap(
        req.user!.userId,
        req.params.id as string,
        req.body.swapShiftId,
      );
      sendSuccess(res, { message: 'Response recorded' });
    } catch (err) {
      next(err);
    }
  },
);

// iCal export (staff)
staffRouter.get('/export/ical', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shifts = await shiftService.getStaffShifts(req.user!.userId);
    const ical = await shiftService.exportIcal(shifts);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=my-shifts.ics');
    res.send(ical);
  } catch (err) {
    next(err);
  }
});

// Mount sub-routers
router.use('/admin', adminRouter);
router.use('/my-shifts', staffRouter);

export { router as shiftRoutes };
