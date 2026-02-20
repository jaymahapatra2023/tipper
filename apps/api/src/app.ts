import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth.routes';
import { qrRoutes } from './routes/qr.routes';
import { tipRoutes } from './routes/tip.routes';
import { staffRoutes } from './routes/staff.routes';
import { adminRoutes } from './routes/admin.routes';
import { platformRoutes } from './routes/platform.routes';
import { webhookRoutes } from './routes/webhook.routes';

const app = express();

// Stripe webhooks need raw body
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Global middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(generalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/qr', qrRoutes);
app.use('/api/v1/tips', tipRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/platform', platformRoutes);

// Error handler
app.use(errorHandler);

export { app };
