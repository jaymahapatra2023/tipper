import crypto from 'crypto';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { prisma } from '@tipper/database';
import { QR_CODE_LENGTH } from '@tipper/shared';

import { logAudit } from '../utils/audit';
import { NotFoundError, BadRequestError } from '../utils/errors';

export interface QrColors {
  dark: string;
  light: string;
}

export interface HotelQrConfig {
  colors: QrColors;
  logoEnabled: boolean;
  logoUrl: string | null;
}

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
                feedbackTags: true,
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
      feedbackTags:
        qrCode.room.hotel.feedbackTags.length > 0 ? qrCode.room.hotel.feedbackTags : undefined,
    };
  }

  async getHotelQrConfig(hotelId: string): Promise<HotelQrConfig> {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        qrForegroundColor: true,
        qrBackgroundColor: true,
        qrLogoEnabled: true,
        logoUrl: true,
      },
    });
    return {
      colors: {
        dark: hotel?.qrForegroundColor || '#000000',
        light: hotel?.qrBackgroundColor || '#ffffff',
      },
      logoEnabled: hotel?.qrLogoEnabled ?? false,
      logoUrl: hotel?.logoUrl ?? null,
    };
  }

  async generateForRoom(roomId: string, appUrl: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundError('Room');

    // Get hotel QR config for colors
    const config = await this.getHotelQrConfig(room.hotelId);

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
      errorCorrectionLevel: 'H',
      color: { dark: config.colors.dark, light: config.colors.light },
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

  async generateHighResBuffer(url: string, colors?: QrColors): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      width: 1200,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: colors?.dark || '#000000',
        light: colors?.light || '#ffffff',
      },
    });
  }

  async generateHighResBufferWithLogo(
    url: string,
    colors: QrColors,
    logoUrl: string,
  ): Promise<Buffer> {
    const qrBuffer = await this.generateHighResBuffer(url, colors);

    try {
      // Fetch the logo image
      const response = await fetch(logoUrl);
      if (!response.ok) return qrBuffer; // Fall back to plain QR if logo fetch fails
      const logoArrayBuffer = await response.arrayBuffer();
      const logoBuffer = Buffer.from(logoArrayBuffer);

      // Resize logo to ~20% of QR size (1200 * 0.2 = 240px)
      const logoSize = 240;
      const resizedLogo = await sharp(logoBuffer)
        .resize(logoSize, logoSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toBuffer();

      // Add a white background padding around the logo for better contrast
      const padding = 20;
      const bgSize = logoSize + padding * 2;
      const logoBg = await sharp({
        create: {
          width: bgSize,
          height: bgSize,
          channels: 4,
          background: colors.light || '#ffffff',
        },
      })
        .composite([{ input: resizedLogo, left: padding, top: padding }])
        .png()
        .toBuffer();

      // Composite logo in the center of the QR code
      const offset = Math.round((1200 - bgSize) / 2);
      return sharp(qrBuffer)
        .composite([{ input: logoBg, left: offset, top: offset }])
        .png()
        .toBuffer();
    } catch {
      // If logo processing fails, return plain QR
      return qrBuffer;
    }
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
