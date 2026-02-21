import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@tipper/database';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { tipService } from '../services/tip.service';
import { payoutService } from '../services/payout.service';

const router: Router = Router();

router.post('/stripe', async (req: Request, res: Response, next: NextFunction) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    // Idempotency check: skip already-processed events
    const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
    if (existing) {
      return res.json({ received: true, duplicate: true });
    }

    // Record event before processing to prevent concurrent duplicates
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await tipService.handlePaymentSuccess(paymentIntent.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await tipService.handlePaymentFailed(paymentIntent.id);
        break;
      }
      case 'account.updated': {
        const account = event.data.object;
        if (account.charges_enabled && account.payouts_enabled) {
          // Update hotel if this is a hotel Connect account
          await prisma.hotel.updateMany({
            where: { stripeAccountId: account.id, stripeOnboarded: false },
            data: { stripeOnboarded: true },
          });
          // Update staff member if this is a staff Connect account
          await prisma.staffMember.updateMany({
            where: { stripeAccountId: account.id, stripeOnboarded: false },
            data: { stripeOnboarded: true },
          });
        }
        break;
      }
      case 'transfer.reversed': {
        const transfer = event.data.object;
        await payoutService.handleTransferReversed(transfer.id);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export { router as webhookRoutes };
