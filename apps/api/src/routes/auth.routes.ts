import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { authService } from '../services/auth.service';
import { mfaService } from '../services/mfa.service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authLimiter, resetLimiter, mfaLimiter } from '../middleware/rateLimiter';
import { getClientIp } from '../utils/audit';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  hotelOnboardSchema,
  mfaVerifySchema,
  mfaRecoverySchema,
  mfaSetupVerifySchema,
} from '@tipper/shared';

const router: Router = Router();

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, role } = req.body;
      const result = await authService.register(email, password, name, role, getClientIp(req));

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, getClientIp(req));

      // If MFA is required, return MFA token (no session tokens yet)
      if ('mfaRequired' in result && result.mfaRequired) {
        sendSuccess(res, {
          mfaRequired: true,
          mfaToken: (result as { mfaToken: string }).mfaToken,
        });
        return;
      }

      const loginResult = result as {
        user: { id: string; email: string; name: string; role: string };
        accessToken: string;
        refreshToken: string;
        needsMfaSetup?: boolean;
      };

      res.cookie('refreshToken', loginResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      sendSuccess(res, {
        user: loginResult.user,
        accessToken: loginResult.accessToken,
        needsMfaSetup: loginResult.needsMfaSetup,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/register/hotel',
  authLimiter,
  validate(hotelOnboardSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hotelName, name, email, password } = req.body;
      const result = await authService.registerHotel(
        hotelName,
        name,
        email,
        password,
        getClientIp(req),
      );

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      sendSuccess(
        res,
        { user: result.user, hotel: result.hotel, accessToken: result.accessToken },
        201,
      );
    } catch (err) {
      next(err);
    }
  },
);

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    const result = await authService.refresh(token);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    sendSuccess(res, { accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;

    // Best-effort userId extraction from Authorization header
    let userId: string | undefined;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const decoded = jwt.verify(authHeader.slice(7), env.JWT_ACCESS_SECRET) as {
          userId?: string;
        };
        userId = decoded.userId;
      }
    } catch {
      // Token may be expired or invalid — proceed without userId
    }

    if (token) await authService.logout(token, userId, getClientIp(req));

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    sendSuccess(res, { message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/forgot-password',
  resetLimiter,
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.forgotPassword(req.body.email, getClientIp(req));
      sendSuccess(res, { message: 'If an account exists, a reset email has been sent' });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/reset-password',
  resetLimiter,
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password, getClientIp(req));
      sendSuccess(res, { message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getUserById(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

// MFA endpoints
router.post(
  '/mfa/verify',
  mfaLimiter,
  validate(mfaVerifySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mfaToken, code } = req.body;
      const result = await authService.verifyMfa(mfaToken, code, getClientIp(req));

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      sendSuccess(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/mfa/recovery',
  mfaLimiter,
  validate(mfaRecoverySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mfaToken, recoveryCode } = req.body;
      const result = await authService.verifyMfaRecovery(mfaToken, recoveryCode, getClientIp(req));

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      sendSuccess(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/mfa/setup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mfaService.setupMfa(req.user!.userId, getClientIp(req));
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/mfa/setup/confirm',
  authenticate,
  validate(mfaSetupVerifySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await mfaService.confirmMfaSetup(
        req.user!.userId,
        req.body.code,
        getClientIp(req),
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.put('/locale', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { preferredLocale } = req.body;
    if (!['en', 'es', 'fr'].includes(preferredLocale)) {
      sendSuccess(res, { message: 'Invalid locale' }, 400);
      return;
    }
    const { prisma } = await import('@tipper/database');
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { preferredLocale },
    });
    sendSuccess(res, { message: 'Locale updated' });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/mfa/disable',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await mfaService.disableMfa(req.user!.userId, getClientIp(req));
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

export { router as authRoutes };
