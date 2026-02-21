import { prisma } from '@tipper/database';
import { PASSWORD_SALT_ROUNDS, UserRole } from '@tipper/shared';
import type { StaffCreateInput, RoomCreateInput, HotelSettingsInput } from '@tipper/shared';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { stripe } from '../config/stripe';
import { emailService } from './email.service';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export class AdminService {
  async getHotel(userId: string) {
    const admin = await this.getHotelAdmin(userId);
    return prisma.hotel.findUnique({ where: { id: admin.hotelId } });
  }

  async updateHotelSettings(userId: string, settings: HotelSettingsInput) {
    const admin = await this.getHotelAdmin(userId);
    return prisma.hotel.update({
      where: { id: admin.hotelId },
      data: settings,
    });
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

  async createStaff(userId: string, input: StaffCreateInput) {
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

    return prisma.staffMember.create({
      data: { userId: user.id, hotelId: admin.hotelId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async resetStaffPassword(adminUserId: string, targetUserId: string) {
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

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'admin_reset_password',
        entityType: 'user',
        entityId: targetUserId,
      },
    });

    return { message: 'Password reset successfully' };
  }

  async deactivateStaff(userId: string, staffMemberId: string) {
    const admin = await this.getHotelAdmin(userId);
    const staff = await prisma.staffMember.findUnique({ where: { id: staffMemberId } });
    if (!staff || staff.hotelId !== admin.hotelId) throw new NotFoundError('Staff member');

    return prisma.staffMember.update({
      where: { id: staffMemberId },
      data: { isActive: false },
    });
  }

  async importStaff(userId: string, staffList: StaffCreateInput[]) {
    const results = [];
    for (const input of staffList) {
      try {
        const staff = await this.createStaff(userId, input);
        results.push({ email: input.email, status: 'created', id: staff.id });
      } catch (err) {
        results.push({
          email: input.email,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
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

  async createRoom(userId: string, input: RoomCreateInput) {
    const admin = await this.getHotelAdmin(userId);

    const existing = await prisma.room.findFirst({
      where: { hotelId: admin.hotelId, roomNumber: input.roomNumber },
    });
    if (existing) throw new ConflictError(`Room ${input.roomNumber} already exists`);

    return prisma.room.create({
      data: { ...input, hotelId: admin.hotelId },
    });
  }

  async deleteRoom(userId: string, roomId: string) {
    const admin = await this.getHotelAdmin(userId);
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hotelId !== admin.hotelId) throw new NotFoundError('Room');

    return prisma.room.update({
      where: { id: roomId },
      data: { isActive: false },
    });
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

    return prisma.roomAssignment.create({
      data: { staffMemberId, roomId, assignedDate: new Date(assignedDate) },
    });
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

    const [overview, tipsByRoom, tipsByDate, locationVerifiedCount] = await Promise.all([
      prisma.tip.aggregate({
        where,
        _count: true,
        _sum: { totalAmount: true, netAmount: true },
        _avg: { totalAmount: true },
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
    ]);

    // Get room numbers for room analytics
    const roomIds = tipsByRoom.map((r) => r.roomId);
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, roomNumber: true },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r.roomNumber]));

    return {
      totalTips: overview._count,
      totalAmount: overview._sum.totalAmount ?? 0,
      netAmount: overview._sum.netAmount ?? 0,
      averageTip: Math.round(overview._avg.totalAmount ?? 0),
      tipsByRoom: tipsByRoom.map((r) => ({
        roomNumber: roomMap.get(r.roomId) ?? 'Unknown',
        count: r._count,
        total: r._sum.totalAmount ?? 0,
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

  private async getHotelAdmin(userId: string) {
    const admin = await prisma.hotelAdmin.findFirst({ where: { userId } });
    if (!admin) throw new ForbiddenError('Not a hotel admin');
    return admin;
  }
}

export const adminService = new AdminService();
