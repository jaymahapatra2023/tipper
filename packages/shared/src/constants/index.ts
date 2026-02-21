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
  'transfer.created',
  'transfer.reversed',
] as const;

export const MIN_PAYOUT_AMOUNT = 100; // $1.00 in cents

export const DEFAULT_FEEDBACK_TAGS = [
  'Spotless room',
  'Friendly staff',
  'Went above and beyond',
  'Great attention to detail',
  'Quick service',
] as const;

export const MAX_FEEDBACK_TAGS = 10;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

export const STAFF_MILESTONES = [
  {
    id: 'tips_10',
    label: 'First Steps',
    description: 'Receive 10 tips',
    threshold: 10,
    type: 'tip_count' as const,
    icon: 'Star',
  },
  {
    id: 'tips_50',
    label: 'Rising Star',
    description: 'Receive 50 tips',
    threshold: 50,
    type: 'tip_count' as const,
    icon: 'TrendingUp',
  },
  {
    id: 'tips_100',
    label: 'Century Club',
    description: 'Receive 100 tips',
    threshold: 100,
    type: 'tip_count' as const,
    icon: 'Award',
  },
  {
    id: 'tips_500',
    label: 'Tip Legend',
    description: 'Receive 500 tips',
    threshold: 500,
    type: 'tip_count' as const,
    icon: 'Crown',
  },
  {
    id: 'earnings_5000',
    label: 'Earning $50',
    description: 'Earn $50 in total tips',
    threshold: 5000,
    type: 'earnings' as const,
    icon: 'DollarSign',
  },
  {
    id: 'earnings_50000',
    label: 'Earning $500',
    description: 'Earn $500 in total tips',
    threshold: 50000,
    type: 'earnings' as const,
    icon: 'Gem',
  },
  {
    id: 'streak_5',
    label: 'Perfect Five',
    description: '5 consecutive 5-star ratings',
    threshold: 5,
    type: 'five_star_streak' as const,
    icon: 'Flame',
  },
  {
    id: 'rating_avg_45',
    label: 'Top Rated',
    description: 'Average rating of 4.5 or higher',
    threshold: 4.5,
    type: 'avg_rating' as const,
    icon: 'ThumbsUp',
  },
] as const;
