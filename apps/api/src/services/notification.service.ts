import { prisma } from '@tipper/database';
import type { Prisma } from '@tipper/database';

export class NotificationService {
  async create(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return prisma.notification.create({
      data: { userId, type, title, message, metadata },
    });
  }

  async list(
    userId: string,
    { page = 1, limit = 20, unreadOnly }: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const where: { userId: string; isRead?: boolean } = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total, page, limit };
  }

  async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async unreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}

export const notificationService = new NotificationService();
