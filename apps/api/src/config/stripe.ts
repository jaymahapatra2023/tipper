import Stripe from 'stripe';

import { env } from './env';

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' })
  : null;
