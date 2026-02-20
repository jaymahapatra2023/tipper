export const DEFAULT_SUGGESTED_AMOUNTS = [500, 1000, 1500]; // in cents
export const DEFAULT_MIN_TIP = 100; // $1.00
export const DEFAULT_MAX_TIP = 50000; // $500.00
export const DEFAULT_CURRENCY = 'usd';
export const DEFAULT_PLATFORM_FEE_PERCENT = 10;

export const QR_CODE_LENGTH = 12;
export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_CSV_ROWS = 500;
export const MAX_ROOMS_PER_HOTEL = 2000;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_SALT_ROUNDS = 12;

export const STRIPE_WEBHOOK_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'account.updated',
  'payout.paid',
  'payout.failed',
] as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};
