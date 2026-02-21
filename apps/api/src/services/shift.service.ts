import { prisma } from '@tipper/database';
import type {
  ShiftCreateInput,
  ShiftUpdateInput,
  ShiftQueryInput,
  ShiftView,
  OnShiftNowEntry,
  TemplateCreateInput,
  TemplateApplyInput,
  ShiftTemplateView,
  ShiftSwapRequestView,
} from '@tipper/shared';

import { logAudit } from '../utils/audit';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

function mapShiftToView(shift: any): ShiftView {
  return {
    id: shift.id,
    staffMemberId: shift.staffMemberId,
    staffName: shift.staffMember?.user?.name ?? '',
    hotelId: shift.hotelId,
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime.toISOString(),
    status: shift.status,
    notes: shift.notes ?? undefined,
    rooms: (shift.rooms ?? []).map((sr: any) => ({
      id: sr.room.id,
      roomNumber: sr.room.roomNumber,
    })),
    createdAt: shift.createdAt.toISOString(),
  };
}

const shiftInclude = {
  staffMember: { include: { user: { select: { name: true } } } },
  rooms: { include: { room: { select: { id: true, roomNumber: true } } } },
};

export class ShiftService {
  // ────── CRUD ──────

  async createShift(hotelId: string, input: ShiftCreateInput, userId?: string, ipAddress?: string) {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    // Validate staff belongs to hotel
    const staff = await prisma.staffMember.findFirst({
      where: { id: input.staffMemberId, hotelId, isActive: true },
    });
    if (!staff) throw new NotFoundError('Staff member');

    // Validate rooms belong to hotel
    const rooms = await prisma.room.findMany({
      where: { id: { in: input.roomIds }, hotelId },
    });
    if (rooms.length !== input.roomIds.length) {
      throw new BadRequestError('One or more rooms not found in this hotel');
    }

    // Check for overlapping shifts for the same staff member
    await this.checkOverlap(input.staffMemberId, startTime, endTime);

    const shift = await prisma.shift.create({
      data: {
        hotelId,
        staffMemberId: input.staffMemberId,
        startTime,
        endTime,
        notes: input.notes,
        rooms: {
          create: input.roomIds.map((roomId) => ({ roomId })),
        },
      },
      include: shiftInclude,
    });

    logAudit({
      userId,
      action: 'shift_create',
      entityType: 'shift',
      entityId: shift.id,
      metadata: {
        staffMemberId: input.staffMemberId,
        startTime: input.startTime,
        endTime: input.endTime,
      },
      ipAddress,
    });

    return mapShiftToView(shift);
  }

  async updateShift(
    hotelId: string,
    shiftId: string,
    input: ShiftUpdateInput,
    userId?: string,
    ipAddress?: string,
  ) {
    const existing = await prisma.shift.findFirst({
      where: { id: shiftId, hotelId },
    });
    if (!existing) throw new NotFoundError('Shift');
    if (existing.status === 'cancelled')
      throw new BadRequestError('Cannot update a cancelled shift');

    const staffMemberId = input.staffMemberId ?? existing.staffMemberId;
    const startTime = input.startTime ? new Date(input.startTime) : existing.startTime;
    const endTime = input.endTime ? new Date(input.endTime) : existing.endTime;

    // If staff or times changed, recheck overlap
    if (input.staffMemberId || input.startTime || input.endTime) {
      await this.checkOverlap(staffMemberId, startTime, endTime, shiftId);
    }

    // If rooms changed, validate and re-create
    if (input.roomIds) {
      const rooms = await prisma.room.findMany({
        where: { id: { in: input.roomIds }, hotelId },
      });
      if (rooms.length !== input.roomIds.length) {
        throw new BadRequestError('One or more rooms not found in this hotel');
      }

      await prisma.shiftRoom.deleteMany({ where: { shiftId } });
      await prisma.shiftRoom.createMany({
        data: input.roomIds.map((roomId) => ({ shiftId, roomId })),
      });
    }

    const shift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        staffMemberId,
        startTime,
        endTime,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
      include: shiftInclude,
    });

    logAudit({
      userId,
      action: 'shift_update',
      entityType: 'shift',
      entityId: shiftId,
      ipAddress,
    });

    return mapShiftToView(shift);
  }

  async cancelShift(hotelId: string, shiftId: string, userId?: string, ipAddress?: string) {
    const shift = await prisma.shift.findFirst({ where: { id: shiftId, hotelId } });
    if (!shift) throw new NotFoundError('Shift');

    await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'cancelled' },
    });

    logAudit({
      userId,
      action: 'shift_cancel',
      entityType: 'shift',
      entityId: shiftId,
      ipAddress,
    });
  }

  async getShifts(hotelId: string, query: ShiftQueryInput): Promise<ShiftView[]> {
    const where: any = { hotelId };

    if (query.staffMemberId) where.staffMemberId = query.staffMemberId;
    if (query.status) where.status = query.status;

    if (query.date) {
      const dayStart = new Date(query.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(query.date);
      dayEnd.setHours(23, 59, 59, 999);
      where.startTime = { lte: dayEnd };
      where.endTime = { gte: dayStart };
    } else if (query.startDate || query.endDate) {
      if (query.startDate) {
        where.endTime = { gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        where.startTime = { ...where.startTime, lte: new Date(query.endDate) };
      }
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: shiftInclude,
      orderBy: { startTime: 'asc' },
    });

    return shifts.map(mapShiftToView);
  }

  async getStaffShifts(userId: string): Promise<ShiftView[]> {
    const staff = await prisma.staffMember.findFirst({
      where: { userId, isActive: true },
    });
    if (!staff) throw new NotFoundError('Staff member');

    const now = new Date();
    const shifts = await prisma.shift.findMany({
      where: {
        staffMemberId: staff.id,
        status: { not: 'cancelled' },
        endTime: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // include last 24h
      },
      include: shiftInclude,
      orderBy: { startTime: 'asc' },
    });

    return shifts.map(mapShiftToView);
  }

  async updateShiftStatus(userId: string, shiftId: string, status: 'in_progress' | 'completed') {
    const staff = await prisma.staffMember.findFirst({
      where: { userId, isActive: true },
    });
    if (!staff) throw new NotFoundError('Staff member');

    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, staffMemberId: staff.id },
    });
    if (!shift) throw new NotFoundError('Shift');

    if (status === 'in_progress' && shift.status !== 'scheduled') {
      throw new BadRequestError('Can only check in to a scheduled shift');
    }
    if (status === 'completed' && shift.status !== 'in_progress') {
      throw new BadRequestError('Can only check out from an in-progress shift');
    }

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: { status },
      include: shiftInclude,
    });

    return mapShiftToView(updated);
  }

  // ────── ON SHIFT NOW ──────

  async getOnShiftNow(hotelId: string): Promise<OnShiftNowEntry[]> {
    const now = new Date();
    const shifts = await prisma.shift.findMany({
      where: {
        hotelId,
        startTime: { lte: now },
        endTime: { gte: now },
        status: { in: ['scheduled', 'in_progress'] },
      },
      include: shiftInclude,
    });

    return shifts.map((s) => ({
      staffMemberId: s.staffMemberId,
      staffName: (s as any).staffMember?.user?.name ?? '',
      shiftId: s.id,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      rooms: ((s as any).rooms ?? []).map((sr: any) => ({
        id: sr.room.id,
        roomNumber: sr.room.roomNumber,
      })),
    }));
  }

  // ────── TIP ATTRIBUTION FALLBACK ──────

  async findStaffOnShift(hotelId: string, roomId: string, date: Date): Promise<string[]> {
    const shifts = await prisma.shift.findMany({
      where: {
        hotelId,
        startTime: { lte: date },
        endTime: { gte: date },
        status: { in: ['scheduled', 'in_progress', 'completed'] },
        rooms: { some: { roomId } },
      },
      select: { staffMemberId: true },
    });

    return [...new Set(shifts.map((s) => s.staffMemberId))];
  }

  // ────── TEMPLATES ──────

  async createTemplate(
    hotelId: string,
    input: TemplateCreateInput,
    userId?: string,
    ipAddress?: string,
  ) {
    // Validate all staff belong to hotel
    const staffIds = [...new Set(input.entries.map((e) => e.staffMemberId))];
    const staff = await prisma.staffMember.findMany({
      where: { id: { in: staffIds }, hotelId, isActive: true },
    });
    if (staff.length !== staffIds.length) {
      throw new BadRequestError('One or more staff members not found in this hotel');
    }

    const template = await prisma.shiftTemplate.create({
      data: {
        hotelId,
        name: input.name,
        entries: {
          create: input.entries.map((e) => ({
            staffMemberId: e.staffMemberId,
            dayOfWeek: e.dayOfWeek,
            startHour: e.startHour,
            startMinute: e.startMinute ?? 0,
            endHour: e.endHour,
            endMinute: e.endMinute ?? 0,
            roomIds: e.roomIds ?? [],
          })),
        },
      },
      include: {
        entries: {
          include: { template: false },
        },
      },
    });

    logAudit({
      userId,
      action: 'shift_template_create',
      entityType: 'shift_template',
      entityId: template.id,
      metadata: { name: input.name },
      ipAddress,
    });

    return template;
  }

  async getTemplates(hotelId: string): Promise<ShiftTemplateView[]> {
    const templates = await prisma.shiftTemplate.findMany({
      where: { hotelId },
      include: {
        entries: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Gather staff names for entries
    const staffIds = [...new Set(templates.flatMap((t) => t.entries.map((e) => e.staffMemberId)))];
    const staffMembers = await prisma.staffMember.findMany({
      where: { id: { in: staffIds } },
      include: { user: { select: { name: true } } },
    });
    const staffMap = new Map(staffMembers.map((s) => [s.id, s.user.name]));

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      isActive: t.isActive,
      entries: t.entries.map((e) => ({
        id: e.id,
        staffMemberId: e.staffMemberId,
        staffName: staffMap.get(e.staffMemberId) ?? '',
        dayOfWeek: e.dayOfWeek as any,
        startHour: e.startHour,
        startMinute: e.startMinute,
        endHour: e.endHour,
        endMinute: e.endMinute,
        roomIds: e.roomIds,
      })),
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async deleteTemplate(hotelId: string, templateId: string, userId?: string, ipAddress?: string) {
    const template = await prisma.shiftTemplate.findFirst({ where: { id: templateId, hotelId } });
    if (!template) throw new NotFoundError('Template');

    await prisma.shiftTemplate.delete({ where: { id: templateId } });

    logAudit({
      userId,
      action: 'shift_template_delete',
      entityType: 'shift_template',
      entityId: templateId,
      ipAddress,
    });
  }

  async applyTemplate(
    hotelId: string,
    templateId: string,
    input: TemplateApplyInput,
    userId?: string,
    ipAddress?: string,
  ): Promise<{ created: number; skipped: number }> {
    const template = await prisma.shiftTemplate.findFirst({
      where: { id: templateId, hotelId },
      include: { entries: true },
    });
    if (!template) throw new NotFoundError('Template');

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundError('Hotel');

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    const dayOfWeekMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    let created = 0;
    let skipped = 0;

    // Iterate each day in the range
    const current = new Date(startDate);
    while (current <= endDate) {
      const jsDow = current.getDay(); // 0=sunday

      // Find matching template entries for this day of week
      const matchingEntries = template.entries.filter((e) => dayOfWeekMap[e.dayOfWeek] === jsDow);

      for (const entry of matchingEntries) {
        const shiftStart = new Date(current);
        shiftStart.setHours(entry.startHour, entry.startMinute, 0, 0);

        const shiftEnd = new Date(current);
        shiftEnd.setHours(entry.endHour, entry.endMinute, 0, 0);

        // If end is before start, it wraps to next day
        if (shiftEnd <= shiftStart) {
          shiftEnd.setDate(shiftEnd.getDate() + 1);
        }

        // Check for overlap before creating
        try {
          await this.checkOverlap(entry.staffMemberId, shiftStart, shiftEnd);

          await prisma.shift.create({
            data: {
              hotelId,
              staffMemberId: entry.staffMemberId,
              startTime: shiftStart,
              endTime: shiftEnd,
              templateId,
              rooms:
                entry.roomIds.length > 0
                  ? { create: entry.roomIds.map((roomId) => ({ roomId })) }
                  : undefined,
            },
          });
          created++;
        } catch {
          skipped++;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    logAudit({
      userId,
      action: 'shift_template_apply',
      entityType: 'shift_template',
      entityId: templateId,
      metadata: { startDate: input.startDate, endDate: input.endDate, created, skipped },
      ipAddress,
    });

    return { created, skipped };
  }

  // ────── SWAP REQUESTS ──────

  async requestSwap(
    userId: string,
    originalShiftId: string,
    targetStaffId?: string,
    reason?: string,
  ) {
    const staff = await prisma.staffMember.findFirst({ where: { userId, isActive: true } });
    if (!staff) throw new NotFoundError('Staff member');

    const shift = await prisma.shift.findFirst({
      where: { id: originalShiftId, staffMemberId: staff.id, status: 'scheduled' },
    });
    if (!shift) throw new NotFoundError('Shift');

    const swap = await prisma.shiftSwapRequest.create({
      data: {
        originalShiftId,
        requesterId: staff.id,
        targetStaffId: targetStaffId || null,
        reason,
      },
    });

    return swap;
  }

  async getSwapRequests(hotelId: string): Promise<ShiftSwapRequestView[]> {
    const requests = await prisma.shiftSwapRequest.findMany({
      where: {
        originalShift: { hotelId },
      },
      include: {
        originalShift: { include: shiftInclude },
        requester: { include: { user: { select: { name: true } } } },
        targetStaff: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      originalShiftId: r.originalShiftId,
      requesterName: r.requester.user.name,
      requesterId: r.requesterId,
      targetStaffName: r.targetStaff?.user?.name ?? undefined,
      targetStaffId: r.targetStaffId ?? undefined,
      swapShiftId: r.swapShiftId ?? undefined,
      status: r.status as any,
      reason: r.reason ?? undefined,
      reviewedBy: r.reviewedBy ?? undefined,
      reviewedAt: r.reviewedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      originalShift: mapShiftToView(r.originalShift),
    }));
  }

  async getMySwapRequests(userId: string) {
    const staff = await prisma.staffMember.findFirst({ where: { userId, isActive: true } });
    if (!staff) throw new NotFoundError('Staff member');

    const requests = await prisma.shiftSwapRequest.findMany({
      where: {
        OR: [{ requesterId: staff.id }, { targetStaffId: staff.id }],
      },
      include: {
        originalShift: { include: shiftInclude },
        requester: { include: { user: { select: { name: true } } } },
        targetStaff: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      originalShiftId: r.originalShiftId,
      requesterName: r.requester.user.name,
      requesterId: r.requesterId,
      targetStaffName: r.targetStaff?.user?.name ?? undefined,
      targetStaffId: r.targetStaffId ?? undefined,
      status: r.status,
      reason: r.reason ?? undefined,
      createdAt: r.createdAt.toISOString(),
      originalShift: mapShiftToView(r.originalShift),
    }));
  }

  async respondToSwap(userId: string, swapId: string, swapShiftId?: string) {
    const staff = await prisma.staffMember.findFirst({ where: { userId, isActive: true } });
    if (!staff) throw new NotFoundError('Staff member');

    const swap = await prisma.shiftSwapRequest.findFirst({
      where: { id: swapId, targetStaffId: staff.id, status: 'pending' },
    });
    if (!swap) throw new NotFoundError('Swap request');

    await prisma.shiftSwapRequest.update({
      where: { id: swapId },
      data: { swapShiftId: swapShiftId || null },
    });
  }

  async reviewSwap(
    hotelId: string,
    swapId: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
    ipAddress?: string,
  ) {
    const swap = await prisma.shiftSwapRequest.findFirst({
      where: { id: swapId, originalShift: { hotelId }, status: 'pending' },
      include: { originalShift: true },
    });
    if (!swap) throw new NotFoundError('Swap request');

    if (status === 'approved') {
      // Reassign the shift to the target staff
      if (swap.targetStaffId) {
        await prisma.shift.update({
          where: { id: swap.originalShiftId },
          data: { staffMemberId: swap.targetStaffId },
        });
      }
    }

    await prisma.shiftSwapRequest.update({
      where: { id: swapId },
      data: { status, reviewedBy: reviewerId, reviewedAt: new Date() },
    });

    logAudit({
      userId: reviewerId,
      action: `shift_swap_${status}`,
      entityType: 'shift_swap_request',
      entityId: swapId,
      ipAddress,
    });
  }

  // ────── ICAL EXPORT ──────

  async exportIcal(shifts: ShiftView[]): Promise<string> {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tipper//Shift Schedule//EN',
      'CALSCALE:GREGORIAN',
    ];

    for (const shift of shifts) {
      const dtStart = new Date(shift.startTime)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
      const dtEnd = new Date(shift.endTime)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
      const roomList = shift.rooms.map((r) => r.roomNumber).join(', ');

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${shift.id}@tipper`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:Shift - ${shift.staffName}`);
      lines.push(`DESCRIPTION:Rooms: ${roomList}${shift.notes ? '\\n' + shift.notes : ''}`);
      lines.push(`STATUS:${shift.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  // ────── HELPERS ──────

  private async checkOverlap(
    staffMemberId: string,
    startTime: Date,
    endTime: Date,
    excludeShiftId?: string,
  ) {
    const where: any = {
      staffMemberId,
      status: { not: 'cancelled' },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    };
    if (excludeShiftId) where.id = { not: excludeShiftId };

    const overlapping = await prisma.shift.findFirst({ where });
    if (overlapping) {
      throw new ConflictError('Shift overlaps with an existing shift for this staff member');
    }
  }
}

export const shiftService = new ShiftService();
