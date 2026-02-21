import { prisma } from '@tipper/database';
import { MIN_PAYOUT_AMOUNT } from '@tipper/shared';
import type { PayoutView, PayoutAnalytics, PayoutProcessResult } from '@tipper/shared';

import { stripe } from '../config/stripe';
import { NotFoundError } from '../utils/errors';
import { notificationService } from './notification.service';

export class PayoutService {
  async processPayouts(): Promise<PayoutProcessResult> {
    // Find all unpaid distributions grouped by staff member
    const unpaidByStaff = await prisma.tipDistribution.groupBy({
      by: ['staffMemberId'],
      where: {
        payoutId: null,
        tip: { status: 'succeeded' },
      },
      _sum: { amount: true },
    });

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const group of unpaidByStaff) {
      const totalAmount = group._sum.amount ?? 0;
      if (totalAmount < MIN_PAYOUT_AMOUNT) {
        skipped++;
        continue;
      }

      try {
        await this.processStaffPayout(group.staffMemberId);
        processed++;
      } catch (err) {
        console.error(`Payout failed for staff ${group.staffMemberId}:`, err);
        failed++;
      }
    }

    return { processed, failed, skipped };
  }

  async processStaffPayout(staffMemberId: string): Promise<void> {
    const staffMember = await prisma.staffMember.findUnique({
      where: { id: staffMemberId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!staffMember) {
      throw new NotFoundError('Staff member');
    }

    if (!staffMember.stripeAccountId || !staffMember.stripeOnboarded) {
      throw new Error(`Staff ${staffMemberId} not Stripe onboarded`);
    }

    // Get all unpaid distributions for this staff member
    const distributions = await prisma.tipDistribution.findMany({
      where: {
        staffMemberId,
        payoutId: null,
        tip: { status: 'succeeded' },
      },
    });

    if (distributions.length === 0) return;

    const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0);
    if (totalAmount < MIN_PAYOUT_AMOUNT) return;

    // Create payout record and link distributions in a transaction
    const payout = await prisma.$transaction(async (tx) => {
      const newPayout = await tx.payout.create({
        data: {
          staffMemberId,
          amount: totalAmount,
          currency: 'usd',
          status: 'processing',
        },
      });

      await tx.tipDistribution.updateMany({
        where: { id: { in: distributions.map((d) => d.id) } },
        data: { payoutId: newPayout.id },
      });

      return newPayout;
    });

    // Execute Stripe transfer
    try {
      if (!stripe) {
        throw new Error('Stripe not configured');
      }

      const transfer = await stripe.transfers.create({
        amount: totalAmount,
        currency: 'usd',
        destination: staffMember.stripeAccountId,
        metadata: {
          payoutId: payout.id,
          staffMemberId,
        },
      });

      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          stripeTransferId: transfer.id,
          status: 'completed',
          processedAt: new Date(),
        },
      });

      notificationService
        .create(
          staffMember.userId,
          'payout_completed',
          'Payout Completed',
          `Your payout of $${(totalAmount / 100).toFixed(2)} has been completed`,
          { payoutId: payout.id, amount: totalAmount },
        )
        .catch((err) => console.error('Failed to create payout notification:', err));
    } catch (err) {
      // Unlink distributions so they can be retried
      await prisma.$transaction([
        prisma.tipDistribution.updateMany({
          where: { payoutId: payout.id },
          data: { payoutId: null },
        }),
        prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'failed',
            failureReason: err instanceof Error ? err.message : 'Unknown error',
          },
        }),
      ]);

      notificationService
        .create(
          staffMember.userId,
          'payout_failed',
          'Payout Failed',
          `Your payout of $${(totalAmount / 100).toFixed(2)} could not be processed`,
          { payoutId: payout.id, amount: totalAmount },
        )
        .catch((notifErr) =>
          console.error('Failed to create payout failure notification:', notifErr),
        );

      throw err;
    }
  }

  async retryPayout(payoutId: string): Promise<void> {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: { staffMember: true },
    });

    if (!payout) throw new NotFoundError('Payout');
    if (payout.status !== 'failed') {
      throw new Error('Only failed payouts can be retried');
    }

    // Reset payout and re-process
    await prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'processing', failureReason: null },
    });

    try {
      if (!stripe) throw new Error('Stripe not configured');
      if (!payout.staffMember.stripeAccountId) {
        throw new Error('Staff not Stripe onboarded');
      }

      const transfer = await stripe.transfers.create({
        amount: payout.amount,
        currency: payout.currency,
        destination: payout.staffMember.stripeAccountId,
        metadata: {
          payoutId: payout.id,
          staffMemberId: payout.staffMemberId,
        },
      });

      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          stripeTransferId: transfer.id,
          status: 'completed',
          processedAt: new Date(),
        },
      });
    } catch (err) {
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'failed',
          failureReason: err instanceof Error ? err.message : 'Unknown error',
        },
      });
      throw err;
    }
  }

  async getAllPayouts(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{
    payouts: PayoutView[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where = status ? { status: status as any } : {};

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        include: {
          staffMember: {
            include: {
              user: { select: { name: true, email: true } },
              hotel: { select: { name: true } },
            },
          },
          _count: { select: { distributions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payout.count({ where }),
    ]);

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        staffName: p.staffMember.user.name,
        staffEmail: p.staffMember.user.email,
        hotelName: p.staffMember.hotel.name,
        amount: p.amount,
        currency: p.currency,
        status: p.status as any,
        failureReason: p.failureReason ?? undefined,
        stripeTransferId: p.stripeTransferId ?? undefined,
        distributionCount: p._count.distributions,
        processedAt: p.processedAt?.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getPayoutAnalytics(): Promise<PayoutAnalytics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [completed, pending, failed, last30Days] = await Promise.all([
      prisma.payout.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payout.aggregate({
        where: { status: { in: ['pending', 'processing'] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payout.aggregate({
        where: { status: 'failed' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payout.aggregate({
        where: { status: 'completed', processedAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
    ]);

    // Also count unpaid distributions as pending
    const unpaidDistributions = await prisma.tipDistribution.aggregate({
      where: { payoutId: null, tip: { status: 'succeeded' } },
      _sum: { amount: true },
    });

    return {
      totalPaid: completed._sum.amount ?? 0,
      totalPending: (pending._sum.amount ?? 0) + (unpaidDistributions._sum.amount ?? 0),
      totalFailed: failed._sum.amount ?? 0,
      paidCount: completed._count,
      pendingCount: pending._count,
      failedCount: failed._count,
      last30DaysPaid: last30Days._sum.amount ?? 0,
    };
  }

  async handleTransferFailed(transferId: string): Promise<void> {
    const payout = await prisma.payout.findUnique({
      where: { stripeTransferId: transferId },
    });

    if (!payout) return;

    await prisma.$transaction([
      prisma.tipDistribution.updateMany({
        where: { payoutId: payout.id },
        data: { payoutId: null },
      }),
      prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'failed', failureReason: 'Transfer failed via webhook' },
      }),
    ]);
  }

  async handleTransferReversed(transferId: string): Promise<void> {
    const payout = await prisma.payout.findUnique({
      where: { stripeTransferId: transferId },
    });

    if (!payout) return;

    await prisma.$transaction([
      prisma.tipDistribution.updateMany({
        where: { payoutId: payout.id },
        data: { payoutId: null },
      }),
      prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'failed', failureReason: 'Transfer reversed via webhook' },
      }),
    ]);
  }
}

export const payoutService = new PayoutService();
