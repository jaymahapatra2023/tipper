import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  UserRole,
  hotelSettingsSchema,
  hotelProfileSchema,
  hotelBrandingSchema,
  roomBulkGenerateSchema,
  staffCreateSchema,
  staffWeightUpdateSchema,
  roomCreateSchema,
  assignmentCreateSchema,
  analyticsExportSchema,
  auditLogQuerySchema,
} from '@tipper/shared';

import { adminService } from '../services/admin.service';
import { uploadService } from '../services/upload.service';
import { qrService } from '../services/qr.service';
import { qrExportService } from '../services/qr-export.service';
import { analyticsExportService } from '../services/analytics-export.service';
import { auditLogService } from '../services/audit-log.service';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getClientIp } from '../utils/audit';
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
      const hotel = await adminService.updateHotelSettings(
        req.user!.userId,
        req.body,
        getClientIp(req),
      );
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
      const hotel = await adminService.updateHotelProfile(
        req.user!.userId,
        req.body,
        getClientIp(req),
      );
      sendSuccess(res, hotel);
    } catch (err) {
      next(err);
    }
  },
);

// Hotel Branding
router.post(
  '/hotel/branding/upload-url',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contentType } = req.body;
      const hotel = await adminService.getHotel(req.user!.userId);
      const result = await uploadService.generatePresignedUploadUrl(hotel!.id, contentType);
      sendSuccess(res, { uploadUrl: result.uploadUrl, publicUrl: result.publicUrl });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/hotel/branding',
  validate(hotelBrandingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotel = await adminService.updateHotelBranding(
        req.user!.userId,
        req.body,
        getClientIp(req),
      );
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
      const result = await adminService.bulkCreateRooms(
        req.user!.userId,
        req.body,
        getClientIp(req),
      );
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
      const staff = await adminService.createStaff(req.user!.userId, req.body, getClientIp(req));
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
        getClientIp(req),
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/staff/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminService.deactivateStaff(req.user!.userId, req.params.id as string, getClientIp(req));
    sendSuccess(res, { message: 'Staff member deactivated' });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/staff/:id/weight',
  validate(staffWeightUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.updateStaffWeight(
        req.user!.userId,
        req.params.id as string,
        req.body.poolWeight,
        getClientIp(req),
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/pool/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.getPoolPreview(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/staff/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await adminService.importStaff(
      req.user!.userId,
      req.body.staff,
      getClientIp(req),
    );
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
      const room = await adminService.createRoom(req.user!.userId, req.body, getClientIp(req));
      sendSuccess(res, room, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/rooms/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminService.deleteRoom(req.user!.userId, req.params.id as string, getClientIp(req));
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
    const result = await qrService.regenerate(
      req.params.id as string,
      appUrl,
      req.user!.userId,
      getClientIp(req),
    );
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
    const qrConfig = await qrService.getHotelQrConfig(hotel!.id);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="qr-codes-${hotel!.name.replace(/[^a-zA-Z0-9]/g, '-')}.zip"`,
    });

    const stream = qrExportService.generateZip(qrData, qrConfig);
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
    const qrConfig = await qrService.getHotelQrConfig(hotel!.id);
    const pdfBuffer = await qrExportService.generatePdf(qrData, hotel!.name, qrConfig);

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
    const result = await qrService.regenerateAll(
      hotel!.id,
      appUrl,
      req.user!.userId,
      getClientIp(req),
    );
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
        getClientIp(req),
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

router.get(
  '/analytics/export',
  validate(analyticsExportSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, startDate, endDate } = req.query as {
        type: 'tips' | 'payouts' | 'staff';
        startDate?: string;
        endDate?: string;
      };
      const hotel = await adminService.getHotel(req.user!.userId);

      let csv: string;
      switch (type) {
        case 'tips':
          csv = await analyticsExportService.exportTips(hotel!.id, startDate, endDate);
          break;
        case 'payouts':
          csv = await analyticsExportService.exportPayouts(hotel!.id, startDate, endDate);
          break;
        case 'staff':
          csv = await analyticsExportService.exportStaffPerformance(hotel!.id, startDate, endDate);
          break;
      }

      const filename = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
);

// Audit Logs
router.get(
  '/audit-logs',
  validate(auditLogQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query as unknown as import('@tipper/shared').AuditLogQueryInput;
      const hotel = await adminService.getHotel(req.user!.userId);
      const userIds = await getHotelUserIds(hotel!.id);
      const result = await auditLogService.getLogs(filters, userIds);
      sendSuccess(res, result.logs, 200, {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/audit-logs/filters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotel = await adminService.getHotel(req.user!.userId);
    const userIds = await getHotelUserIds(hotel!.id);
    const options = await auditLogService.getFilterOptions(userIds);
    sendSuccess(res, options);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/audit-logs/export',
  validate(auditLogQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query as unknown as import('@tipper/shared').AuditLogQueryInput;
      const hotel = await adminService.getHotel(req.user!.userId);
      const userIds = await getHotelUserIds(hotel!.id);
      const csv = await auditLogService.exportCsv(filters, userIds);

      const filename = `audit-log-export-${new Date().toISOString().split('T')[0]}.csv`;
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
);

async function getHotelUserIds(hotelId: string): Promise<string[]> {
  const { prisma } = await import('@tipper/database');
  const [admins, staff] = await Promise.all([
    prisma.hotelAdmin.findMany({ where: { hotelId }, select: { userId: true } }),
    prisma.staffMember.findMany({ where: { hotelId }, select: { userId: true } }),
  ]);
  return [...admins.map((a) => a.userId), ...staff.map((s) => s.userId)];
}

export { router as adminRoutes };
