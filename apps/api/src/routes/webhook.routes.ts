import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { tipService } from '../services/tip.service';

const router = Router();

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
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export { router as webhookRoutes };
