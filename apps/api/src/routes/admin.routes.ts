import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  UserRole,
  hotelSettingsSchema,
  staffCreateSchema,
  roomCreateSchema,
  assignmentCreateSchema,
} from '@tipper/shared';

import { adminService } from '../services/admin.service';
import { qrService } from '../services/qr.service';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../utils/response';

const router = Router();

router.use(authenticate, authorize(UserRole.HOTEL_ADMIN));

// Hotel
router.get('/hotel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotel = await adminService.getHotel(req.user!.userId);
    sendSuccess(res, hotel);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/hotel/settings',
  validate(hotelSettingsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotel = await adminService.updateHotelSettings(req.user!.userId, req.body);
      sendSuccess(res, hotel);
    } catch (err) {
      next(err);
    }
  },
);

// Staff CRUD
router.get('/staff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await adminService.getStaff(req.user!.userId);
    sendSuccess(res, staff);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/staff',
  validate(staffCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staff = await adminService.createStaff(req.user!.userId, req.body);
      sendSuccess(res, staff, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/staff/:id/reset-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.resetStaffPassword(req.user!.userId, req.params.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/staff/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminService.deactivateStaff(req.user!.userId, req.params.id);
    sendSuccess(res, { message: 'Staff member deactivated' });
  } catch (err) {
    next(err);
  }
});

router.post('/staff/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await adminService.importStaff(req.user!.userId, req.body.staff);
    sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
});

// Rooms
router.get('/rooms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rooms = await adminService.getRooms(req.user!.userId);
    sendSuccess(res, rooms);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/rooms',
  validate(roomCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const room = await adminService.createRoom(req.user!.userId, req.body);
      sendSuccess(res, room, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/rooms/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminService.deleteRoom(req.user!.userId, req.params.id);
    sendSuccess(res, { message: 'Room deactivated' });
  } catch (err) {
    next(err);
  }
});

// QR Codes
router.get('/rooms/:id/qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qr = await qrService.getQrCodeForRoom(req.params.id);
    sendSuccess(res, qr);
  } catch (err) {
    next(err);
  }
});

router.post('/rooms/:id/qr/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const result = await qrService.regenerate(req.params.id, appUrl);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// Assignments
router.get('/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.getAssignments(req.user!.userId, req.query.date as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/assignments',
  validate(assignmentCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { staffMemberId, roomId, assignedDate } = req.body;
      const result = await adminService.createAssignment(
        req.user!.userId,
        staffMemberId,
        roomId,
        assignedDate,
      );
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);

// Stripe Connect
router.post('/stripe/onboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const returnUrl = req.body.returnUrl || process.env.NEXT_PUBLIC_APP_URL + '/admin-settings';
    const result = await adminService.createStripeOnboardingLink(req.user!.userId, returnUrl);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.get('/stripe/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.getStripeOnboardingStatus(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// Analytics
router.get('/analytics/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const result = await adminService.getAnalytics(req.user!.userId, startDate, endDate);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

export { router as adminRoutes };
