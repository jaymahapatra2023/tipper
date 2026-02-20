import { prisma } from '@tipper/database';

import { NotFoundError } from '../utils/errors';

export class PlatformService {
  async getHotels(page = 1, limit = 20, status?: string) {
    const where = status ? { status: status as 'pending' | 'approved' | 'suspended' } : {};

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { rooms: true, staffMembers: true, tips: true } },
        },
      }),
      prisma.hotel.count({ where }),
    ]);

    return { hotels, total, page, limit };
  }

  async approveHotel(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundError('Hotel');

    return prisma.hotel.update({
      where: { id: hotelId },
      data: { status: 'approved' },
    });
  }

  async suspendHotel(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundError('Hotel');

    return prisma.hotel.update({
      where: { id: hotelId },
      data: { status: 'suspended' },
    });
  }

  async getAnalytics() {
    const [totalHotels, totalTips, totalVolume, recentTips] = await Promise.all([
      prisma.hotel.count({ where: { status: 'approved' } }),
      prisma.tip.count({ where: { status: 'succeeded' } }),
      prisma.tip.aggregate({
        where: { status: 'succeeded' },
        _sum: { totalAmount: true, platformFee: true },
      }),
      prisma.tip.count({
        where: {
          status: 'succeeded',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      totalHotels,
      totalTips,
      totalVolume: totalVolume._sum.totalAmount ?? 0,
      totalRevenue: totalVolume._sum.platformFee ?? 0,
      last30DaysTips: recentTips,
    };
  }

  async getSettings() {
    let settings = await prisma.platformSettings.findFirst();
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: { defaultPlatformFeePercent: 10 },
      });
    }
    return settings;
  }

  async updateSettings(defaultPlatformFeePercent: number) {
    const settings = await this.getSettings();
    return prisma.platformSettings.update({
      where: { id: settings.id },
      data: { defaultPlatformFeePercent },
    });
  }
}

export const platformService = new PlatformService();
