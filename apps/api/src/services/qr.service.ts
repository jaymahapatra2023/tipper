import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '@tipper/database';
import { QR_CODE_LENGTH } from '@tipper/shared';

import { logAudit } from '../utils/audit';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class QrService {
  async resolve(code: string) {
    const qrCode = await prisma.qrCode.findUnique({
      where: { code },
      include: {
        room: {
          include: {
            hotel: {
              select: {
                id: true,
                name: true,
                suggestedAmounts: true,
                minTipAmount: true,
                maxTipAmount: true,
                currency: true,
                status: true,
                geofenceEnabled: true,
                geofenceLatitude: true,
                geofenceLongitude: true,
                geofenceRadius: true,
                logoUrl: true,
                primaryColor: true,
                secondaryColor: true,
              },
            },
          },
        },
      },
    });

    if (!qrCode || qrCode.status !== 'active') {
      throw new NotFoundError('QR code');
    }

    if (qrCode.room.hotel.status !== 'approved') {
      throw new BadRequestError('Hotel is not currently accepting tips');
    }

    // Increment scan count
    await prisma.qrCode.update({
      where: { id: qrCode.id },
      data: { scanCount: { increment: 1 } },
    });

    return {
      hotelName: qrCode.room.hotel.name,
      hotelId: qrCode.room.hotel.id,
      roomNumber: qrCode.room.roomNumber,
      roomId: qrCode.room.id,
      floor: qrCode.room.floor,
      suggestedAmounts: qrCode.room.hotel.suggestedAmounts,
      minTip: qrCode.room.hotel.minTipAmount,
      maxTip: qrCode.room.hotel.maxTipAmount,
      currency: qrCode.room.hotel.currency,
      geofenceEnabled: qrCode.room.hotel.geofenceEnabled,
      geofenceLatitude: qrCode.room.hotel.geofenceLatitude,
      geofenceLongitude: qrCode.room.hotel.geofenceLongitude,
      geofenceRadius: qrCode.room.hotel.geofenceRadius,
      logoUrl: qrCode.room.hotel.logoUrl ?? undefined,
      primaryColor: qrCode.room.hotel.primaryColor ?? undefined,
      secondaryColor: qrCode.room.hotel.secondaryColor ?? undefined,
    };
  }

  async generateForRoom(roomId: string, appUrl: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundError('Room');

    // Revoke existing active codes
    await prisma.qrCode.updateMany({
      where: { roomId, status: 'active' },
      data: { status: 'revoked', revokedAt: new Date() },
    });

    const code = crypto.randomBytes(QR_CODE_LENGTH / 2).toString('hex');
    const qrCode = await prisma.qrCode.create({
      data: { roomId, code },
    });

    const url = `${appUrl}/tip/${code}`;
    const qrImage = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return { qrCode, url, qrImage };
  }

  async regenerate(roomId: string, appUrl: string, userId?: string, ipAddress?: string) {
    const result = await this.generateForRoom(roomId, appUrl);
    logAudit({
      userId,
      action: 'qr_regenerate',
      entityType: 'room',
      entityId: roomId,
      metadata: { roomId },
      ipAddress,
    });
    return result;
  }

  async getQrCodeForRoom(roomId: string) {
    return prisma.qrCode.findFirst({
      where: { roomId, status: 'active' },
      include: { room: true },
    });
  }

  async generateHighResBuffer(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      width: 1200,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  async getAllActiveQrCodes(hotelId: string, appUrl: string) {
    const rooms = await prisma.room.findMany({
      where: { hotelId, isActive: true },
      include: { qrCodes: { where: { status: 'active' }, take: 1 } },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    return rooms
      .filter((r) => r.qrCodes.length > 0)
      .map((r) => ({
        roomNumber: r.roomNumber,
        floor: r.floor,
        code: r.qrCodes[0].code,
        url: `${appUrl}/tip/${r.qrCodes[0].code}`,
      }));
  }

  async regenerateAll(hotelId: string, appUrl: string, userId?: string, ipAddress?: string) {
    const rooms = await prisma.room.findMany({
      where: { hotelId, isActive: true },
    });

    let generated = 0;
    for (const room of rooms) {
      await this.generateForRoom(room.id, appUrl);
      generated++;
    }

    logAudit({
      userId,
      action: 'qr_regenerate_all',
      entityType: 'hotel',
      entityId: hotelId,
      metadata: { hotelId, count: generated },
      ipAddress,
    });

    return { generated, total: rooms.length };
  }
}

export const qrService = new QrService();
