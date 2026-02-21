import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  UserRole,
  hotelSettingsSchema,
  hotelProfileSchema,
  roomBulkGenerateSchema,
  staffCreateSchema,
  roomCreateSchema,
  assignmentCreateSchema,
} from '@tipper/shared';

import { adminService } from '../services/admin.service';
import { qrService } from '../services/qr.service';
import { qrExportService } from '../services/qr-export.service';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

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

// Hotel Profile (onboarding)
router.put(
  '/hotel/profile',
  validate(hotelProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotel = await adminService.updateHotelProfile(req.user!.userId, req.body);
      sendSuccess(res, hotel);
    } catch (err) {
      next(err);
    }
  },
);

// Bulk room generation (onboarding)
router.post(
  '/rooms/bulk-generate',
  validate(roomBulkGenerateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.bulkCreateRooms(req.user!.userId, req.body);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);

// Onboarding status
router.get('/onboarding/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await adminService.getOnboardingStatus(req.user!.userId);
    sendSuccess(res, status);
  } catch (err) {
    next(err);
  }
});

router.put('/onboarding/step', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { step } = req.body;
    const hotel = await adminService.updateOnboardingStep(req.user!.userId, step);
    sendSuccess(res, hotel);
  } catch (err) {
    next(err);
  }
});

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
      const result = await adminService.resetStaffPassword(
        req.user!.userId,
        req.params.id as string,
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/staff/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminService.deactivateStaff(req.user!.userId, req.params.id as string);
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
    await adminService.deleteRoom(req.user!.userId, req.params.id as string);
    sendSuccess(res, { message: 'Room deactivated' });
  } catch (err) {
    next(err);
  }
});

// QR Codes
router.get('/rooms/:id/qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qr = await qrService.getQrCodeForRoom(req.params.id as string);
    sendSuccess(res, qr);
  } catch (err) {
    next(err);
  }
});

router.post('/rooms/:id/qr/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const result = await qrService.regenerate(req.params.id as string, appUrl);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// QR Bulk Operations
router.get('/qr/download/zip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const hotel = await adminService.getHotel(req.user!.userId);
    const qrData = await qrService.getAllActiveQrCodes(hotel!.id, appUrl);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="qr-codes-${hotel!.name.replace(/[^a-zA-Z0-9]/g, '-')}.zip"`,
    });

    const stream = qrExportService.generateZip(qrData);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

router.get('/qr/download/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const hotel = await adminService.getHotel(req.user!.userId);
    const qrData = await qrService.getAllActiveQrCodes(hotel!.id, appUrl);
    const pdfBuffer = await qrExportService.generatePdf(qrData, hotel!.name);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="qr-codes-${hotel!.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    });

    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

router.post('/qr/regenerate-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const hotel = await adminService.getHotel(req.user!.userId);
    const result = await qrService.regenerateAll(hotel!.id, appUrl);
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
