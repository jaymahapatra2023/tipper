import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { authService } from '../services/auth.service';
import { mfaService } from '../services/mfa.service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authLimiter, resetLimiter, mfaLimiter } from '../middleware/rateLimiter';
import { sendSuccess } from '../utils/response';
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
      const result = await authService.register(email, password, name, role);

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
      const result = await authService.login(email, password);

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
      const result = await authService.registerHotel(hotelName, name, email, password);

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
    if (token) await authService.logout(token);

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
      await authService.forgotPassword(req.body.email);
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
      await authService.resetPassword(req.body.token, req.body.password);
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
      const result = await authService.verifyMfa(mfaToken, code);

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
      const result = await authService.verifyMfaRecovery(mfaToken, recoveryCode);

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
    const result = await mfaService.setupMfa(req.user!.userId);
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
      const result = await mfaService.confirmMfaSetup(req.user!.userId, req.body.code);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/mfa/disable',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await mfaService.disableMfa(req.user!.userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

export { router as authRoutes };
