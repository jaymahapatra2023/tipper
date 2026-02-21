import { prisma } from '@tipper/database';
import { STAFF_MILESTONES } from '@tipper/shared';
import type {
  StaffPerformanceMetrics,
  StaffMilestone,
  LeaderboardEntry,
  StaffPerformanceResponse,
  DailyEarningsData,
} from '@tipper/shared';

import { stripe } from '../config/stripe';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export class StaffService {
  async getDashboard(userId: string) {
    const staffMember = await this.getStaffMember(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEarnings, monthEarnings, recentTips, pendingAssignments, ratingAgg] =
      await Promise.all([
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
        prisma.tip.aggregate({
          where: {
            status: 'succeeded',
            rating: { not: null },
            distributions: { some: { staffMemberId: staffMember.id } },
          },
          _avg: { rating: true },
          _count: { rating: true },
        }),
      ]);

    return {
      totalEarnings: totalEarnings._sum.amount ?? 0,
      periodEarnings: monthEarnings._sum.amount ?? 0,
      tipCount: recentTips.length,
      averageRating: ratingAgg._avg.rating ?? undefined,
      ratedTipCount: ratingAgg._count.rating,
      recentTips: recentTips.map((td) => ({
        id: td.id,
        roomNumber: td.tip.room.roomNumber,
        amount: td.amount,
        message: td.tip.message ?? undefined,
        rating: td.tip.rating ?? undefined,
        feedbackTags: td.tip.feedbackTags.length > 0 ? td.tip.feedbackTags : undefined,
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
        rating: td.tip.rating ?? undefined,
        feedbackTags: td.tip.feedbackTags.length > 0 ? td.tip.feedbackTags : undefined,
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

  async getPerformance(userId: string): Promise<StaffPerformanceResponse> {
    const staffMember = await this.getStaffMember(userId);
    const [metrics, leaderboard] = await Promise.all([
      this.getPerformanceMetrics(staffMember),
      this.getLeaderboard(staffMember),
    ]);
    return { metrics, leaderboard: leaderboard ?? undefined };
  }

  private async getPerformanceMetrics(staffMember: {
    id: string;
  }): Promise<StaffPerformanceMetrics> {
    const now = new Date();

    // Week boundaries
    const dayOfWeek = now.getDay();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - dayOfWeek);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Month boundaries
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 30 days ago for chart
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const succeededFilter = {
      staffMemberId: staffMember.id,
      tip: { status: 'succeeded' as const },
    };

    const [
      totalAgg,
      tipCount,
      thisWeekAgg,
      lastWeekAgg,
      thisMonthAgg,
      lastMonthAgg,
      ratingAgg,
      last30DaysDistributions,
      recentRatedTips,
    ] = await Promise.all([
      prisma.tipDistribution.aggregate({
        where: succeededFilter,
        _sum: { amount: true },
      }),
      prisma.tipDistribution.count({
        where: succeededFilter,
      }),
      prisma.tipDistribution.aggregate({
        where: { ...succeededFilter, createdAt: { gte: thisWeekStart } },
        _sum: { amount: true },
      }),
      prisma.tipDistribution.aggregate({
        where: { ...succeededFilter, createdAt: { gte: lastWeekStart, lt: thisWeekStart } },
        _sum: { amount: true },
      }),
      prisma.tipDistribution.aggregate({
        where: { ...succeededFilter, createdAt: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.tipDistribution.aggregate({
        where: { ...succeededFilter, createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.tip.aggregate({
        where: {
          status: 'succeeded',
          rating: { not: null },
          distributions: { some: { staffMemberId: staffMember.id } },
        },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.tipDistribution.findMany({
        where: { ...succeededFilter, createdAt: { gte: thirtyDaysAgo } },
        include: { tip: { select: { createdAt: true } } },
      }),
      prisma.tip.findMany({
        where: {
          status: 'succeeded',
          rating: { not: null },
          distributions: { some: { staffMemberId: staffMember.id } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { rating: true },
      }),
    ]);

    const totalEarnings = totalAgg._sum.amount ?? 0;
    const thisWeekEarnings = thisWeekAgg._sum.amount ?? 0;
    const lastWeekEarnings = lastWeekAgg._sum.amount ?? 0;
    const thisMonthEarnings = thisMonthAgg._sum.amount ?? 0;
    const lastMonthEarnings = lastMonthAgg._sum.amount ?? 0;
    const averageRating = ratingAgg._avg.rating ?? undefined;

    // Trend calculations
    const weekTrend =
      lastWeekEarnings > 0
        ? Math.round(((thisWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100)
        : thisWeekEarnings > 0
          ? 100
          : 0;

    const monthTrend =
      lastMonthEarnings > 0
        ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
        : thisMonthEarnings > 0
          ? 100
          : 0;

    // Build daily data for chart
    const dailyMap = new Map<string, { earnings: number; tipCount: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), { earnings: 0, tipCount: 0 });
    }
    for (const dist of last30DaysDistributions) {
      const key = dist.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) {
        entry.earnings += dist.amount;
        entry.tipCount += 1;
      }
    }
    const dailyData: DailyEarningsData[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      earnings: data.earnings,
      tipCount: data.tipCount,
    }));

    // 5-star streak
    let fiveStarStreak = 0;
    for (const tip of recentRatedTips) {
      if (tip.rating === 5) fiveStarStreak++;
      else break;
    }

    // Compute milestones
    const milestones: StaffMilestone[] = STAFF_MILESTONES.map((m) => {
      let current: number;
      switch (m.type) {
        case 'tip_count':
          current = tipCount;
          break;
        case 'earnings':
          current = totalEarnings;
          break;
        case 'five_star_streak':
          current = fiveStarStreak;
          break;
        case 'avg_rating':
          current = averageRating ?? 0;
          break;
        default:
          current = 0;
      }
      const achieved = current >= m.threshold;
      const progress = Math.min(100, Math.round((current / m.threshold) * 100));
      return {
        id: m.id,
        label: m.label,
        description: m.description,
        achieved,
        progress,
        icon: m.icon,
      };
    });

    return {
      thisWeekEarnings,
      thisMonthEarnings,
      totalEarnings,
      tipCount,
      averageTip: tipCount > 0 ? Math.round(totalEarnings / tipCount) : 0,
      averageRating,
      weekTrend,
      monthTrend,
      dailyData,
      milestones,
    };
  }

  private async getLeaderboard(staffMember: {
    id: string;
    hotelId: string;
  }): Promise<LeaderboardEntry[] | null> {
    const hotel = await prisma.hotel.findUnique({
      where: { id: staffMember.hotelId },
      select: { leaderboardEnabled: true, leaderboardAnonymized: true },
    });

    if (!hotel?.leaderboardEnabled) return null;

    const allStaff = await prisma.staffMember.findMany({
      where: { hotelId: staffMember.hotelId, isActive: true },
      include: {
        user: { select: { name: true } },
        tipDistributions: {
          where: { tip: { status: 'succeeded' } },
          select: { amount: true, tip: { select: { rating: true } } },
        },
      },
    });

    const entries = allStaff.map((s) => {
      const totalEarnings = s.tipDistributions.reduce((sum, d) => sum + d.amount, 0);
      const tipCount = s.tipDistributions.length;
      const ratedTips = s.tipDistributions.filter((d) => d.tip.rating != null);
      const averageRating =
        ratedTips.length > 0
          ? Math.round(
              (ratedTips.reduce((sum, d) => sum + (d.tip.rating ?? 0), 0) / ratedTips.length) * 10,
            ) / 10
          : undefined;

      return {
        staffMemberId: s.id,
        staffName:
          hotel.leaderboardAnonymized && s.id !== staffMember.id
            ? `Staff #${s.id.slice(-4).toUpperCase()}`
            : s.user.name,
        tipCount,
        totalEarnings,
        averageRating,
        isCurrentUser: s.id === staffMember.id,
      };
    });

    entries.sort((a, b) => b.totalEarnings - a.totalEarnings);

    return entries.map((e, i) => ({
      rank: i + 1,
      staffName: e.staffName,
      tipCount: e.tipCount,
      totalEarnings: e.totalEarnings,
      averageRating: e.averageRating,
      isCurrentUser: e.isCurrentUser,
    }));
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
