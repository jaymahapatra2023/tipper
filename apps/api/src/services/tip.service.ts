import { prisma } from '@tipper/database';
import type { TipCreateInput } from '@tipper/shared';
import { DEFAULT_PLATFORM_FEE_PERCENT } from '@tipper/shared';

import { stripe } from '../config/stripe';
import { BadRequestError, NotFoundError } from '../utils/errors';

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

    // Create tip record
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
        ...(hotel.stripeAccountId && hotel.stripeOnboarded
          ? {
              transfer_data: {
                destination: hotel.stripeAccountId,
                amount: netAmount,
              },
            }
          : {}),
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
}

export const tipService = new TipService();
