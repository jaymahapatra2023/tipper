import { prisma } from '@tipper/database';

import { stripe } from '../config/stripe';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export class StaffService {
  async getDashboard(userId: string) {
    const staffMember = await this.getStaffMember(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEarnings, monthEarnings, recentTips, pendingAssignments] = await Promise.all([
      prisma.tipDistribution.aggregate({
        where: { staffMemberId: staffMember.id, tip: { status: 'succeeded' } },
        _sum: { amount: true },
      }),
      prisma.tipDistribution.aggregate({
        where: {
          staffMemberId: staffMember.id,
          tip: { status: 'succeeded' },
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.tipDistribution.findMany({
        where: { staffMemberId: staffMember.id, tip: { status: 'succeeded' } },
        include: { tip: { include: { room: { select: { roomNumber: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.roomAssignment.count({
        where: { staffMemberId: staffMember.id, isClaimed: false },
      }),
    ]);

    return {
      totalEarnings: totalEarnings._sum.amount ?? 0,
      periodEarnings: monthEarnings._sum.amount ?? 0,
      tipCount: recentTips.length,
      recentTips: recentTips.map((td) => ({
        id: td.id,
        roomNumber: td.tip.room.roomNumber,
        amount: td.amount,
        message: td.tip.message ?? undefined,
        date: td.createdAt.toISOString(),
      })),
      pendingAssignments,
    };
  }

  async getTips(userId: string, page = 1, limit = 20) {
    const staffMember = await this.getStaffMember(userId);

    const [tips, total] = await Promise.all([
      prisma.tipDistribution.findMany({
        where: { staffMemberId: staffMember.id, tip: { status: 'succeeded' } },
        include: { tip: { include: { room: { select: { roomNumber: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tipDistribution.count({
        where: { staffMemberId: staffMember.id, tip: { status: 'succeeded' } },
      }),
    ]);

    return {
      tips: tips.map((td) => ({
        id: td.id,
        roomNumber: td.tip.room.roomNumber,
        amount: td.amount,
        message: td.tip.message ?? undefined,
        date: td.createdAt.toISOString(),
        tipMethod: td.tip.tipMethod,
      })),
      total,
      page,
      limit,
    };
  }

  async getAssignments(userId: string) {
    const staffMember = await this.getStaffMember(userId);

    return prisma.roomAssignment.findMany({
      where: { staffMemberId: staffMember.id },
      include: { room: { select: { roomNumber: true, floor: true } } },
      orderBy: { assignedDate: 'desc' },
    });
  }

  async claimAssignment(userId: string, assignmentId: string) {
    const staffMember = await this.getStaffMember(userId);

    const assignment = await prisma.roomAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) throw new NotFoundError('Assignment');
    if (assignment.staffMemberId !== staffMember.id) {
      throw new ForbiddenError('Not your assignment');
    }
    if (assignment.isClaimed) {
      throw new ConflictError('Assignment already claimed');
    }

    return prisma.roomAssignment.update({
      where: { id: assignmentId },
      data: { isClaimed: true, claimedAt: new Date() },
    });
  }

  async updatePoolOptIn(userId: string, optIn: boolean) {
    const staffMember = await this.getStaffMember(userId);
    return prisma.staffMember.update({
      where: { id: staffMember.id },
      data: { poolOptIn: optIn },
    });
  }

  async getPayouts(userId: string, page = 1, limit = 20) {
    const staffMember = await this.getStaffMember(userId);

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where: { staffMemberId: staffMember.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payout.count({ where: { staffMemberId: staffMember.id } }),
    ]);

    return { payouts, total, page, limit };
  }

  async getPayoutSummary(userId: string) {
    const staffMember = await this.getStaffMember(userId);

    const [pendingEarnings, totalPaidOut, lastPayout] = await Promise.all([
      prisma.tipDistribution.aggregate({
        where: {
          staffMemberId: staffMember.id,
          payoutId: null,
          tip: { status: 'succeeded' },
        },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { staffMemberId: staffMember.id, status: 'completed' },
        _sum: { amount: true },
      }),
      prisma.payout.findFirst({
        where: { staffMemberId: staffMember.id, status: 'completed' },
        orderBy: { processedAt: 'desc' },
      }),
    ]);

    return {
      pendingEarnings: pendingEarnings._sum.amount ?? 0,
      totalPaidOut: totalPaidOut._sum.amount ?? 0,
      lastPayoutDate: lastPayout?.processedAt?.toISOString(),
      lastPayoutAmount: lastPayout?.amount,
    };
  }

  // Stripe Connect onboarding
  async createStripeOnboardingLink(userId: string, returnUrl: string) {
    if (!stripe) throw new BadRequestError('Stripe not configured');

    const staffMember = await this.getStaffMember(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    let accountId = staffMember.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      await prisma.staffMember.update({
        where: { id: staffMember.id },
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
    const staffMember = await this.getStaffMember(userId);
    return {
      stripeAccountId: staffMember.stripeAccountId,
      stripeOnboarded: staffMember.stripeOnboarded,
    };
  }

  private async getStaffMember(userId: string) {
    const staffMember = await prisma.staffMember.findFirst({
      where: { userId, isActive: true },
    });
    if (!staffMember) throw new NotFoundError('Staff member');
    return staffMember;
  }
}

export const staffService = new StaffService();
