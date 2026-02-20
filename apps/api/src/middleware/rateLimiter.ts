import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isDev = env.NODE_ENV === 'development';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: isDev ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
});

export const tipLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many tip attempts' } },
});
