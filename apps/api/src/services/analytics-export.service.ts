import { prisma } from '@tipper/database';
import { generateCsv } from '../utils/csv';

function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function centsToDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '0.00';
  return (cents / 100).toFixed(2);
}

function buildDateFilter(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return undefined;
  const filter: Record<string, Date> = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return filter;
}

class AnalyticsExportService {
  async exportTips(hotelId: string, startDate?: string, endDate?: string): Promise<string> {
    const dateFilter = buildDateFilter(startDate, endDate);
    const tips = await prisma.tip.findMany({
      where: {
        hotelId,
        status: 'succeeded',
        ...(dateFilter ? { paidAt: dateFilter } : {}),
      },
      include: {
        room: { select: { roomNumber: true, floor: true } },
        distributions: {
          include: {
            staffMember: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const headers = [
      'Date',
      'Room',
      'Floor',
      'Guest Name',
      'Check-in',
      'Check-out',
      'Tip Method',
      'Gross Amount',
      'Platform Fee',
      'Net Amount',
      'Status',
      'Staff',
      'Location Verified',
      'Message',
    ];

    const rows = tips.map((tip) => {
      const staffNames = tip.distributions.map((d) => d.staffMember.user.name).join('; ');
      return [
        formatDate(tip.paidAt),
        tip.room.roomNumber,
        tip.room.floor,
        tip.guestName || '',
        formatDate(tip.checkInDate),
        formatDate(tip.checkOutDate),
        tip.tipMethod,
        centsToDollars(tip.totalAmount),
        centsToDollars(tip.platformFee),
        centsToDollars(tip.netAmount),
        tip.status,
        staffNames,
        tip.locationVerified ? 'Yes' : 'No',
        tip.message || '',
      ];
    });

    return generateCsv(headers, rows);
  }

  async exportPayouts(hotelId: string, startDate?: string, endDate?: string): Promise<string> {
    const dateFilter = buildDateFilter(startDate, endDate);
    const payouts = await prisma.payout.findMany({
      where: {
        staffMember: { hotelId },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        staffMember: { include: { user: { select: { name: true, email: true } } } },
        distributions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Date',
      'Staff Name',
      'Staff Email',
      'Amount',
      'Status',
      'Tips Included',
      'Processed At',
      'Failure Reason',
    ];

    const rows = payouts.map((p) => [
      formatDate(p.createdAt),
      p.staffMember.user.name,
      p.staffMember.user.email,
      centsToDollars(p.amount),
      p.status,
      p.distributions.length,
      formatDate(p.processedAt),
      p.failureReason || '',
    ]);

    return generateCsv(headers, rows);
  }

  async exportStaffPerformance(
    hotelId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<string> {
    const dateFilter = buildDateFilter(startDate, endDate);

    const staff = await prisma.staffMember.findMany({
      where: { hotelId, isActive: true },
      include: {
        user: { select: { name: true, email: true } },
        tipDistributions: {
          where: {
            tip: {
              status: 'succeeded',
              ...(dateFilter ? { paidAt: dateFilter } : {}),
            },
          },
          include: { tip: { select: { totalAmount: true } } },
        },
        payouts: {
          where: dateFilter ? { createdAt: dateFilter } : {},
        },
      },
    });

    const headers = [
      'Staff Name',
      'Staff Email',
      'Total Tips Received',
      'Total Tip Amount',
      'Total Payouts',
      'Total Payout Amount',
      'Avg Tip Amount',
    ];

    const rows = staff.map((s) => {
      const tipCount = s.tipDistributions.length;
      const tipTotal = s.tipDistributions.reduce((sum, d) => sum + d.amount, 0);
      const payoutCount = s.payouts.length;
      const payoutTotal = s.payouts.reduce((sum, p) => sum + p.amount, 0);
      const avgTip = tipCount > 0 ? tipTotal / tipCount : 0;

      return [
        s.user.name,
        s.user.email,
        tipCount,
        centsToDollars(tipTotal),
        payoutCount,
        centsToDollars(payoutTotal),
        centsToDollars(avgTip),
      ];
    });

    return generateCsv(headers, rows);
  }
}

export const analyticsExportService = new AnalyticsExportService();
