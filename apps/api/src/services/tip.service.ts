import crypto from 'crypto';
import { prisma } from '@tipper/database';
import type { TipCreateInput, TipFeedbackInput, ReceiptData } from '@tipper/shared';
import { DEFAULT_PLATFORM_FEE_PERCENT } from '@tipper/shared';

import { env } from '../config/env';
import { stripe } from '../config/stripe';
import { emailService } from './email.service';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { verifyGeofence } from '../utils/geolocation';
import { notificationService } from './notification.service';

export class TipService {
  async createTip(input: TipCreateInput) {
    // Validate QR code and room
    const qrCode = await prisma.qrCode.findUnique({
      where: { code: input.qrCode },
      include: { room: { include: { hotel: true } } },
    });

    if (!qrCode || qrCode.status !== 'active') {
      throw new BadRequestError('Invalid QR code');
    }

    if (qrCode.room.id !== input.roomId) {
      throw new BadRequestError('Room mismatch');
    }

    const hotel = qrCode.room.hotel;

    // Validate tip amount
    if (input.totalAmount < hotel.minTipAmount) {
      throw new BadRequestError(`Minimum tip is $${(hotel.minTipAmount / 100).toFixed(2)}`);
    }
    if (input.totalAmount > hotel.maxTipAmount) {
      throw new BadRequestError(`Maximum tip is $${(hotel.maxTipAmount / 100).toFixed(2)}`);
    }

    // Calculate platform fee
    const feePercent = hotel.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT;
    const platformFee = Math.round(input.totalAmount * (feePercent / 100));
    const netAmount = input.totalAmount - platformFee;

    // Geolocation verification
    let locationVerified = true;
    let locationDistance: number | undefined;
    const guestLatitude = input.guestLatitude ?? undefined;
    const guestLongitude = input.guestLongitude ?? undefined;
    const guestLocationAccuracy = input.guestLocationAccuracy ?? undefined;

    if (
      hotel.geofenceEnabled &&
      hotel.geofenceLatitude != null &&
      hotel.geofenceLongitude != null
    ) {
      if (guestLatitude != null && guestLongitude != null) {
        const result = verifyGeofence(
          guestLatitude,
          guestLongitude,
          hotel.geofenceLatitude,
          hotel.geofenceLongitude,
          hotel.geofenceRadius,
        );
        locationVerified = result.verified;
        locationDistance = result.distance;
      } else {
        // Guest didn't send coords (denied permission)
        locationVerified = false;
      }
    }

    // Create tip record
    const receiptToken = crypto.randomBytes(24).toString('hex');
    const tip = await prisma.tip.create({
      data: {
        hotelId: hotel.id,
        roomId: input.roomId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        checkInDate: new Date(input.checkInDate),
        checkOutDate: new Date(input.checkOutDate),
        tipMethod: input.tipMethod,
        amountPerDay: input.amountPerDay,
        totalAmount: input.totalAmount,
        platformFee,
        netAmount,
        currency: hotel.currency,
        message: input.message,
        guestLatitude,
        guestLongitude,
        guestLocationAccuracy,
        locationVerified,
        locationDistance,
        receiptToken,
        status: 'pending',
      },
    });

    // Create Stripe PaymentIntent if Stripe is configured
    let clientSecret: string | null = null;
    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: input.totalAmount,
        currency: hotel.currency,
        metadata: {
          tipId: tip.id,
          hotelId: hotel.id,
          roomId: input.roomId,
        },
      });

      await prisma.tip.update({
        where: { id: tip.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: 'processing',
        },
      });

      clientSecret = paymentIntent.client_secret;
    }

    return {
      tipId: tip.id,
      clientSecret,
      amount: tip.totalAmount,
      currency: tip.currency,
      receiptToken: tip.receiptToken,
    };
  }

  async getTipStatus(tipId: string) {
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      include: {
        hotel: { select: { name: true } },
        room: { select: { roomNumber: true } },
      },
    });

    if (!tip) throw new NotFoundError('Tip');

    return {
      tipId: tip.id,
      hotelName: tip.hotel.name,
      roomNumber: tip.room.roomNumber,
      amount: tip.totalAmount,
      currency: tip.currency,
      status: tip.status,
      createdAt: tip.createdAt.toISOString(),
    };
  }

  async handlePaymentSuccess(paymentIntentId: string) {
    const tip = await prisma.tip.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { room: true, hotel: true },
    });

    if (!tip) return;

    await prisma.tip.update({
      where: { id: tip.id },
      data: { status: 'succeeded', paidAt: new Date() },
    });

    // Distribute tip to staff
    await this.distributeTip(tip.id);

    // Create in-app notifications for staff (non-blocking)
    this.createTipNotifications(tip.id, tip.room.roomNumber).catch((err) =>
      console.error('Failed to create tip notifications:', err),
    );

    // Notify staff of tip (non-blocking — email failure must not affect the tip)
    this.notifyStaffOfTip(tip.id).catch((err) =>
      console.error('Failed to send tip notification emails:', err),
    );

    // Send guest receipt email (non-blocking)
    this.sendGuestReceipt(tip.id).catch((err) =>
      console.error('Failed to send guest receipt email:', err),
    );
  }

  async handlePaymentFailed(paymentIntentId: string) {
    await prisma.tip.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: 'failed' },
    });
  }

  private async distributeTip(tipId: string) {
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      include: { hotel: true },
    });

    if (!tip) return;

    // Find staff assigned to this room on the tip date
    const assignments = await prisma.roomAssignment.findMany({
      where: {
        roomId: tip.roomId,
        assignedDate: {
          gte: tip.checkInDate,
          lte: tip.checkOutDate,
        },
      },
      include: { staffMember: true },
    });

    if (assignments.length === 0) return;

    if (tip.hotel.poolingEnabled) {
      // Pool among opted-in staff
      const poolMembers = await prisma.staffMember.findMany({
        where: { hotelId: tip.hotelId, poolOptIn: true, isActive: true },
      });

      if (poolMembers.length === 0) return;

      const perPerson = Math.floor(tip.netAmount / poolMembers.length);
      const remainder = tip.netAmount - perPerson * poolMembers.length;

      for (let i = 0; i < poolMembers.length; i++) {
        await prisma.tipDistribution.create({
          data: {
            tipId,
            staffMemberId: poolMembers[i].id,
            amount: perPerson + (i === 0 ? remainder : 0),
          },
        });
      }
    } else {
      // Direct to assigned staff
      const uniqueStaff = [...new Set(assignments.map((a) => a.staffMemberId))];
      const perPerson = Math.floor(tip.netAmount / uniqueStaff.length);
      const remainder = tip.netAmount - perPerson * uniqueStaff.length;

      for (let i = 0; i < uniqueStaff.length; i++) {
        await prisma.tipDistribution.create({
          data: {
            tipId,
            staffMemberId: uniqueStaff[i],
            amount: perPerson + (i === 0 ? remainder : 0),
          },
        });
      }
    }
  }

  private async notifyStaffOfTip(tipId: string) {
    const distributions = await prisma.tipDistribution.findMany({
      where: { tipId },
      include: {
        staffMember: { include: { user: { select: { email: true, name: true } } } },
        tip: {
          select: { currency: true, message: true, room: { select: { roomNumber: true } } },
        },
      },
    });

    for (const dist of distributions) {
      try {
        await emailService.sendTipNotificationEmail(
          dist.staffMember.user.email,
          dist.staffMember.user.name,
          dist.amount,
          dist.tip.currency,
          dist.tip.room.roomNumber,
          dist.tip.message ?? undefined,
        );
      } catch (err) {
        console.error(`Failed to notify staff ${dist.staffMember.user.email}:`, err);
      }
    }
  }
  private async createTipNotifications(tipId: string, roomNumber: string) {
    const distributions = await prisma.tipDistribution.findMany({
      where: { tipId },
      include: { staffMember: { select: { userId: true } } },
    });

    for (const dist of distributions) {
      await notificationService.create(
        dist.staffMember.userId,
        'tip_received',
        'New Tip Received',
        `You received a $${(dist.amount / 100).toFixed(2)} tip for room ${roomNumber}`,
        { tipId, amount: dist.amount },
      );
    }
  }

  private async fetchReceiptData(tipId: string) {
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      include: {
        hotel: { select: { name: true, address: true, city: true, state: true, zipCode: true } },
        room: { select: { roomNumber: true } },
        distributions: {
          include: { staffMember: { include: { user: { select: { name: true } } } } },
        },
      },
    });

    if (!tip) throw new NotFoundError('Tip');
    return tip;
  }

  private async sendGuestReceipt(tipId: string) {
    const tip = await this.fetchReceiptData(tipId);

    if (!tip.guestEmail) return;

    const staffNames = tip.distributions.map((d) => d.staffMember.user.name);
    const receiptUrl = `${env.CORS_ORIGIN}/receipt/${tip.receiptToken}`;

    // Try to get Stripe receipt URL
    let stripeReceiptUrl: string | undefined;
    if (stripe && tip.stripePaymentIntentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(tip.stripePaymentIntentId, {
          expand: ['latest_charge'],
        });
        const charge = pi.latest_charge;
        if (charge && typeof charge === 'object' && 'receipt_url' in charge) {
          stripeReceiptUrl = (charge as { receipt_url?: string | null }).receipt_url ?? undefined;
        }
      } catch {
        // Non-critical — skip Stripe receipt URL
      }
    }

    await emailService.sendGuestReceiptEmail({
      to: tip.guestEmail,
      guestName: tip.guestName ?? undefined,
      hotelName: tip.hotel.name,
      roomNumber: tip.room.roomNumber,
      totalAmount: tip.totalAmount,
      currency: tip.currency,
      paidAt: tip.paidAt ?? tip.createdAt,
      receiptUrl,
      stripeReceiptUrl,
      staffNames,
    });

    await prisma.tip.update({
      where: { id: tipId },
      data: { receiptSentAt: new Date() },
    });
  }

  async sendReceiptToEmail(tipId: string, email: string) {
    const tip = await this.fetchReceiptData(tipId);

    const staffNames = tip.distributions.map((d) => d.staffMember.user.name);
    const receiptUrl = `${env.CORS_ORIGIN}/receipt/${tip.receiptToken}`;

    let stripeReceiptUrl: string | undefined;
    if (stripe && tip.stripePaymentIntentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(tip.stripePaymentIntentId, {
          expand: ['latest_charge'],
        });
        const charge = pi.latest_charge;
        if (charge && typeof charge === 'object' && 'receipt_url' in charge) {
          stripeReceiptUrl = (charge as { receipt_url?: string | null }).receipt_url ?? undefined;
        }
      } catch {
        // Non-critical
      }
    }

    await emailService.sendGuestReceiptEmail({
      to: email,
      guestName: tip.guestName ?? undefined,
      hotelName: tip.hotel.name,
      roomNumber: tip.room.roomNumber,
      totalAmount: tip.totalAmount,
      currency: tip.currency,
      paidAt: tip.paidAt ?? tip.createdAt,
      receiptUrl,
      stripeReceiptUrl,
      staffNames,
    });

    await prisma.tip.update({
      where: { id: tip.id },
      data: { receiptSentAt: new Date() },
    });
  }

  async getReceiptByToken(token: string): Promise<ReceiptData> {
    const tip = await prisma.tip.findUnique({
      where: { receiptToken: token },
      include: {
        hotel: { select: { name: true, address: true, city: true, state: true, zipCode: true } },
        room: { select: { roomNumber: true } },
        distributions: {
          include: { staffMember: { include: { user: { select: { name: true } } } } },
        },
      },
    });

    if (!tip) throw new NotFoundError('Receipt');

    const hotelAddress = [tip.hotel.address, tip.hotel.city, tip.hotel.state, tip.hotel.zipCode]
      .filter(Boolean)
      .join(', ');

    return {
      tipId: tip.id,
      hotelName: tip.hotel.name,
      hotelAddress,
      roomNumber: tip.room.roomNumber,
      guestName: tip.guestName ?? undefined,
      totalAmount: tip.totalAmount,
      currency: tip.currency,
      tipMethod: tip.tipMethod,
      checkInDate: tip.checkInDate.toISOString(),
      checkOutDate: tip.checkOutDate.toISOString(),
      paidAt: (tip.paidAt ?? tip.createdAt).toISOString(),
      staffNames: tip.distributions.map((d) => d.staffMember.user.name),
      message: tip.message ?? undefined,
      rating: tip.rating ?? undefined,
      feedbackTags: tip.feedbackTags.length > 0 ? tip.feedbackTags : undefined,
    };
  }

  async submitFeedback(token: string, input: TipFeedbackInput) {
    const tip = await prisma.tip.findUnique({
      where: { receiptToken: token },
    });

    if (!tip) throw new NotFoundError('Tip');
    if (tip.status !== 'succeeded') throw new BadRequestError('Tip has not been completed');
    if (tip.rating != null) throw new BadRequestError('Feedback has already been submitted');

    await prisma.tip.update({
      where: { id: tip.id },
      data: {
        rating: input.rating,
        feedbackTags: input.feedbackTags ?? [],
      },
    });

    return { message: 'Feedback submitted successfully' };
  }
}

export const tipService = new TipService();
