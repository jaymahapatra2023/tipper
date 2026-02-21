import { prisma } from '@tipper/database';
import type { FeedbackCreateInput, FeedbackQueryInput, FeedbackUpdateInput } from '@tipper/shared';
import { NotFoundError } from '../utils/errors';
import { logAudit } from '../utils/audit';

class FeedbackService {
  async create(userId: string, data: FeedbackCreateInput, ipAddress?: string) {
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type: data.type,
        subject: data.subject,
        description: data.description,
        priority: data.priority ?? 'medium',
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    logAudit({
      userId,
      action: 'feedback.create',
      entityType: 'feedback',
      entityId: feedback.id,
      metadata: { type: data.type, subject: data.subject },
      ipAddress,
    });

    return feedback;
  }

  async list(filters: FeedbackQueryInput) {
    const { page, limit, type, status } = filters;
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    return { feedback, total, page, limit };
  }

  async update(id: string, data: FeedbackUpdateInput, userId: string, ipAddress?: string) {
    const existing = await prisma.feedback.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Feedback not found');

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;
    if (data.status === 'resolved') updateData.resolvedAt = new Date();

    const feedback = await prisma.feedback.update({
      where: { id },
      data: updateData,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    logAudit({
      userId,
      action: 'feedback.update',
      entityType: 'feedback',
      entityId: id,
      metadata: data,
      ipAddress,
    });

    return feedback;
  }
}

export const feedbackService = new FeedbackService();
