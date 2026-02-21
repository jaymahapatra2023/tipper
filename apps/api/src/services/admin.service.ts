import { prisma } from '@tipper/database';
import { PASSWORD_SALT_ROUNDS, UserRole } from '@tipper/shared';
import type {
  StaffCreateInput,
  RoomCreateInput,
  HotelSettingsInput,
  HotelProfileInput,
  HotelBrandingInput,
} from '@tipper/shared';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { stripe } from '../config/stripe';
import { emailService } from './email.service';
import { logAudit } from '../utils/audit';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export class AdminService {
  async getHotel(userId: string) {
    const admin = await this.getHotelAdmin(userId);
    return prisma.hotel.findUnique({ where: { id: admin.hotelId } });
  }

  async updateHotelSettings(userId: string, settings: HotelSettingsInput, ipAddress?: string) {
    const admin = await this.getHotelAdmin(userId);
    const hotel = await prisma.hotel.update({
      where: { id: admin.hotelId },
      data: settings,
    });
    logAudit({
      userId,
      action: 'hotel_settings_update',
      entityType: 'hotel',
      entityId: admin.hotelId,
      metadata: settings as Record<string, unknown>,
      ipAddress,
    });
    return hotel;
  }

  // Staff management
  async getStaff(userId: string) {
    const admin = await this.getHotelAdmin(userId);
    return prisma.staffMember.findMany({
      where: { hotelId: admin.hotelId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(userId: string, input: StaffCreateInput, ipAddress?: string) {
    const admin = await this.getHotelAdmin(userId);

    // Check if email already exists
    let user = await prisma.user.findUnique({ where: { email: input.email } });

    if (user) {
      // Check if already staff at this hotel
      const existing = await prisma.staffMember.findFirst({
        where: { userId: user.id, hotelId: admin.hotelId },
      });
      if (existing) throw new ConflictError('Staff member already exists at this hotel');
    } else {
      // Create user with temp password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: await bcrypt.hash(tempPassword, PASSWORD_SALT_ROUNDS),
          name: input.name,
          role: UserRole.STAFF,
        },
      });
      await emailService.sendWelcomeEmail(input.email, input.name, tempPassword);
    }

    const staffMember = await prisma.staffMember.create({
      data: { userId: user.id, hotelId: admin.hotelId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    logAudit({
      userId,
      action: 'staff_create',
      entityType: 'staff',
      entityId: staffMember.id,
      metadata: { email: input.email, name: input.name },
      ipAddress,
    });
    return staffMember;
  }

  async resetStaffPassword(adminUserId: string, targetUserId: string, ipAddress?: string) {
    const admin = await this.getHotelAdmin(adminUserId);

    // Verify target user is staff at this hotel
    const staffMember = await prisma.staffMember.findFirst({
      where: { userId: targetUserId, hotelId: admin.hotelId },
      include: { user: true },
    });
    if (!staffMember) throw new NotFoundError('Staff member');

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, PASSWORD_SALT_ROUNDS);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash },
    });

    // Invalidate all existing sessions
    await prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });

    await emailService.sendAdminPasswordResetEmail(
      staffMember.user.email,
      staffMember.user.name,
      tempPassword,
    );

    logAudit({
      userId: adminUserId,
      action: 'admin_reset_password',
      entityType: 'user',
      entityId: targetUserId,
      ipAddress,
    });

    return { message: 'Password reset successfully' };
  }

  async deactivateStaff(userId: string, staffMemberId: string, ipAddress?: string) {
    const admin = await this.getHotelAdmin(userId);
    const staff = await prisma.staffMember.findUnique({ where: { id: staffMemberId } });
    if (!staff || staff.hotelId !== admin.hotelId) throw new NotFoundError('Staff member');

    const result = await prisma.staffMember.update({
      where: { id: staffMemberId },
      data: { isActive: false },
    });
    logAudit({
      userId,
      action: 'staff_deactivate',
      entityType: 'staff',
      entityId: staffMemberId,
      ipAddress,
    });
    return result;
  }

  async importStaff(userId: string, staffList: StaffCreateInput[], ipAddress?: string) {
    const results = [];
    for (const input of staffList) {
      try {
        const staff = await this.createStaff(userId, input, ipAddress);
        results.push({ email: input.email, status: 'created', id: staff.id });
      } catch (err) {
        results.push({
          email: input.email,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    const createdCount = results.filter((r) => r.status === 'created').length;
    logAudit({
      userId,
      action: 'staff_bulk_import',
      entityType: 'staff',
      metadata: { count: createdCount },
      ipAddress,
    });
    return results;
  }

  // Room management
  async getRooms(userId: string) {
    const admin = await this.getHotelAdmin(userId);
    return prisma.room.findMany({
      where: { hotelId: admin.hotelId },
      include: { qrCodes: { where: { status: 'active' } } },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async createRoom(userId: string, input: RoomCreateInput, ipAddress?: string) {
    const admin = await this.getHotelAdmin(userId);

    const existing = await prisma.room.findFirst({
      where: { hotelId: admin.hotelId, roomNumber: input.roomNumber },
    });
    if (existing) throw new ConflictError(`Room ${input.roomNumber} already exists`);

    const room = await prisma.room.create({
      data: { ...input, hotelId: admin.hotelId },
    });
    logAudit({
      userId,
      action: 'room_create',
      entityType: 'room',
      entityId: room.id,
      metadata: { roomNumber: input.roomNumber },
      ipAddress,
    });
    return room;
  }

  async deleteRoom(userId: string, roomId: string, ipAddress?: string) {
    const admin = await this.getHotelAdmin(userId);
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hotelId !== admin.hotelId) throw new NotFoundError('Room');

    const result = await prisma.room.update({
      where: { id: roomId },
      data: { isActive: false },
    });
    logAudit({ userId, action: 'room_delete', entityType: 'room', entityId: roomId, ipAddress });
    return result;
  }

  // Assignments
  async getAssignments(userId: string, date?: string) {
    const admin = await this.getHotelAdmin(userId);
    const where: Record<string, unknown> = {
      room: { hotelId: admin.hotelId },
    };
    if (date) {
      where.assignedDate = new Date(date);
    }

    return prisma.roomAssignment.findMany({
      where,
      include: {
        room: { select: { roomNumber: true, floor: true } },
        staffMember: { include: { user: { select: { name: true } } } },
      },
      orderBy: { assignedDate: 'desc' },
    });
  }

  async createAssignment(
    userId: string,
    staffMemberId: string,
    roomId: string,
    assignedDate: string,
    ipAddress?: string,
  ) {
    const admin = await this.getHotelAdmin(userId);

    // Verify staff and room belong to this hotel
    const [staff, room] = await Promise.all([
      prisma.staffMember.findUnique({ where: { id: staffMemberId } }),
      prisma.room.findUnique({ where: { id: roomId } }),
    ]);

    if (!staff || staff.hotelId !== admin.hotelId) throw new NotFoundError('Staff member');
    if (!room || room.hotelId !== admin.hotelId) throw new NotFoundError('Room');

    const existing = await prisma.roomAssignment.findFirst({
      where: { roomId, assignedDate: new Date(assignedDate) },
    });
    if (existing) throw new ConflictError('Room already assigned for this date');

    const assignment = await prisma.roomAssignment.create({
      data: { staffMemberId, roomId, assignedDate: new Date(assignedDate) },
    });
    logAudit({
      userId,
      action: 'assignment_create',
      entityType: 'assignment',
      entityId: assignment.id,
      metadata: { roomId, staffMemberId, assignedDate },
      ipAddress,
    });
    return assignment;
  }

  // Analytics
  async getAnalytics(userId: string, startDate?: string, endDate?: string) {
    const admin = await this.getHotelAdmin(userId);
    const where: Record<string, unknown> = {
      hotelId: admin.hotelId,
      status: 'succeeded',
    };
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) (where.paidAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.paidAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const [overview, tipsByRoom, tipsByDate, locationVerifiedCount, ratingAgg, ratingGroups] =
      await Promise.all([
        prisma.tip.aggregate({
          where,
          _count: true,
          _sum: { totalAmount: true, netAmount: true },
          _avg: { totalAmount: true, rating: true },
        }),
        prisma.tip.groupBy({
          by: ['roomId'],
          where,
          _count: true,
          _sum: { totalAmount: true },
        }),
        prisma.tip.groupBy({
          by: ['paidAt'],
          where,
          _count: true,
          _sum: { totalAmount: true },
        }),
        prisma.tip.count({
          where: { ...where, locationVerified: true },
        }),
        prisma.tip.count({
          where: { ...where, rating: { not: null } },
        }),
        prisma.tip.groupBy({
          by: ['rating'],
          where: { ...where, rating: { not: null } },
          _count: true,
        }),
      ]);

    // Get room numbers for room analytics
    const roomIds = tipsByRoom.map((r) => r.roomId);
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, roomNumber: true },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r.roomNumber]));

    // Get tipsByStaff with avg ratings
    const distributions = await prisma.tipDistribution.findMany({
      where: { tip: where },
      include: {
        staffMember: { include: { user: { select: { name: true } } } },
        tip: { select: { totalAmount: true, rating: true } },
      },
    });

    const staffMap = new Map<
      string,
      { name: string; count: number; total: number; ratingSum: number; ratedCount: number }
    >();
    for (const d of distributions) {
      const key = d.staffMemberId;
      const existing = staffMap.get(key);
      if (existing) {
        existing.count++;
        existing.total += d.tip.totalAmount;
        if (d.tip.rating != null) {
          existing.ratingSum += d.tip.rating;
          existing.ratedCount++;
        }
      } else {
        staffMap.set(key, {
          name: d.staffMember.user.name,
          count: 1,
          total: d.tip.totalAmount,
          ratingSum: d.tip.rating ?? 0,
          ratedCount: d.tip.rating != null ? 1 : 0,
        });
      }
    }

    // Build rating distribution (5 → 1)
    const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: ratingGroups.find((g) => g.rating === r)?._count ?? 0,
    }));

    return {
      totalTips: overview._count,
      totalAmount: overview._sum.totalAmount ?? 0,
      netAmount: overview._sum.netAmount ?? 0,
      averageTip: Math.round(overview._avg.totalAmount ?? 0),
      averageRating: overview._avg.rating ?? undefined,
      ratedTipCount: ratingAgg,
      ratingDistribution,
      tipsByRoom: tipsByRoom.map((r) => ({
        roomNumber: roomMap.get(r.roomId) ?? 'Unknown',
        count: r._count,
        total: r._sum.totalAmount ?? 0,
      })),
      tipsByStaff: Array.from(staffMap.values()).map((s) => ({
        staffName: s.name,
        count: s.count,
        total: s.total,
        averageRating:
          s.ratedCount > 0 ? Math.round((s.ratingSum / s.ratedCount) * 10) / 10 : undefined,
      })),
      tipsByDate: tipsByDate.map((d) => ({
        date: d.paidAt?.toISOString().split('T')[0] ?? 'Unknown',
        count: d._count,
        total: d._sum.totalAmount ?? 0,
      })),
      locationVerifiedCount,
      locationVerifiedPercent:
        overview._count > 0 ? Math.round((locationVerifiedCount / overview._count) * 100) : 0,
    };
  }

  // Stripe Connect onboarding
  async createStripeOnboardingLink(userId: string, returnUrl: string) {
    if (!stripe) throw new BadRequestError('Stripe not configured');

    const admin = await this.getHotelAdmin(userId);
    const hotel = await prisma.hotel.findUnique({ where: { id: admin.hotelId } });
    if (!hotel) throw new NotFoundError('Hotel');

    let accountId = hotel.stripeAccountId;

    if (!accountId) {
      // Create a new Express Connect account for the hotel
      const account = await stripe.accounts.create({
        type: 'express',
        email: hotel.email,
        business_type: 'company',
        company: { name: hotel.name },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      await prisma.hotel.update({
        where: { id: hotel.id },
        data: { stripeAccountId: accountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${returnUrl}?stripe=refresh`,
      return_url: `${returnUrl}?stripe=complete`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async getStripeOnboardingStatus(userId: string) {
    const admin = await this.getHotelAdmin(userId);
    const hotel = await prisma.hotel.findUnique({ where: { id: admin.hotelId } });
    if (!hotel) throw new NotFoundError('Hotel');

    return {
      stripeAccountId: hotel.stripeAccountId,
      stripeOnboarded: hotel.stripeOnboarded,
    };
  }

  // Hotel profile update (onboarding step 1)
  async updateHotelProfile(userId: string, input: HotelProfileInput, ipAddress?: string) {
    const admin = await this.getHotelAdmin(userId);
    const hotel = await prisma.hotel.update({
      where: { id: admin.hotelId },
      data: {
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        country: input.country,
        phone: input.phone,
        email: input.email,
        website: input.website || null,
      },
    });
    logAudit({
      userId,
      action: 'hotel_profile_update',
      entityType: 'hotel',
      entityId: admin.hotelId,
      ipAddress,
    });
    return hotel;
  }

  // Bulk room creation (onboarding step 2)
  async bulkCreateRooms(
    userId: string,
    input: {
      floor: number;
      startRoom: number;
      endRoom: number;
      roomType?: string;
      prefix?: string;
    },
    ipAddress?: string,
  ) {
    const admin = await this.getHotelAdmin(userId);
    const rooms = [];
    for (let num = input.startRoom; num <= input.endRoom; num++) {
      const roomNumber = input.prefix ? `${input.prefix}${num}` : String(num);
      rooms.push({
        hotelId: admin.hotelId,
        roomNumber,
        floor: input.floor,
        roomType: input.roomType || null,
      });
    }

    const result = await prisma.room.createMany({
      data: rooms,
      skipDuplicates: true,
    });

    logAudit({
      userId,
      action: 'room_bulk_create',
      entityType: 'room',
      metadata: { floor: input.floor, count: result.count },
      ipAddress,
    });

    return { created: result.count, total: rooms.length };
  }

  // Onboarding step tracking
  async updateOnboardingStep(userId: string, step: number) {
    const admin = await this.getHotelAdmin(userId);
    return prisma.hotel.update({
      where: { id: admin.hotelId },
      data: { onboardingStep: step },
    });
  }

  async getOnboardingStatus(userId: string) {
    const admin = await this.getHotelAdmin(userId);
    const hotel = await prisma.hotel.findUnique({ where: { id: admin.hotelId } });
    if (!hotel) throw new NotFoundError('Hotel');

    const [roomCount, staffCount, qrCount] = await Promise.all([
      prisma.room.count({ where: { hotelId: admin.hotelId, isActive: true } }),
      prisma.staffMember.count({ where: { hotelId: admin.hotelId, isActive: true } }),
      prisma.qrCode.count({ where: { room: { hotelId: admin.hotelId }, status: 'active' } }),
    ]);

    return {
      step: hotel.onboardingStep,
      hotelProfile: !!(hotel.address && hotel.city && hotel.phone),
      roomsAdded: roomCount,
      staffAdded: staffCount,
      stripeConnected: hotel.stripeOnboarded,
      qrGenerated: qrCount,
    };
  }

  async updateHotelBranding(userId: string, input: HotelBrandingInput, ipAddress?: string) {
    const admin = await this.getHotelAdmin(userId);
    const hotel = await prisma.hotel.update({
      where: { id: admin.hotelId },
      data: {
        logoUrl: input.logoUrl ?? null,
        primaryColor: input.primaryColor ?? null,
        secondaryColor: input.secondaryColor ?? null,
      },
    });
    logAudit({
      userId,
      action: 'hotel_branding_update',
      entityType: 'hotel',
      entityId: admin.hotelId,
      metadata: input as Record<string, unknown>,
      ipAddress,
    });
    return hotel;
  }

  private async getHotelAdmin(userId: string) {
    const admin = await prisma.hotelAdmin.findFirst({ where: { userId } });
    if (!admin) throw new ForbiddenError('Not a hotel admin');
    return admin;
  }
}

export const adminService = new AdminService();
