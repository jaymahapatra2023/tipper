import cron from 'node-cron';

import { env } from '../config/env';
import { payoutService } from '../services/payout.service';

export function startPayoutScheduler() {
  if (!env.STRIPE_SECRET_KEY) {
    console.log('Payout scheduler disabled: STRIPE_SECRET_KEY not set');
    return;
  }

  const cronExpression = env.PAYOUT_CRON;

  if (!cron.validate(cronExpression)) {
    console.error(`Invalid PAYOUT_CRON expression: ${cronExpression}`);
    return;
  }

  cron.schedule(cronExpression, async () => {
    console.log('Payout scheduler: starting batch processing...');
    try {
      const result = await payoutService.processPayouts();
      console.log(
        `Payout scheduler: processed=${result.processed}, failed=${result.failed}, skipped=${result.skipped}`,
      );
    } catch (err) {
      console.error('Payout scheduler: unexpected error:', err);
    }
  });

  console.log(`Payout scheduler started with cron: ${cronExpression}`);
}
