import crypto from 'crypto';
import { prisma } from '@tipper/database';

import {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCodes,
  verifyRecoveryCode,
} from '../utils/mfa';
import { logAudit } from '../utils/audit';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';

export class MfaService {
  async setupMfa(userId: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.mfaEnabled) throw new BadRequestError('MFA is already enabled');

    const { secret, uri } = generateTotpSecret(user.email);
    const recoveryCodes = generateRecoveryCodes();
    const hashedCodes = await hashRecoveryCodes(recoveryCodes);

    // Store encrypted secret and hashed recovery codes (not yet enabled)
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: encryptSecret(secret),
        mfaRecoveryCodes: hashedCodes,
      },
    });

    logAudit({
      userId,
      action: 'mfa_setup_initiated',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    });

    return {
      secret,
      qrCodeUrl: uri,
      recoveryCodes,
    };
  }

  async confirmMfaSetup(userId: string, code: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.mfaEnabled) throw new BadRequestError('MFA is already enabled');
    if (!user.mfaSecret) throw new BadRequestError('MFA setup not started');

    const secret = decryptSecret(user.mfaSecret);
    if (!verifyTotp(secret, code)) {
      throw new BadRequestError('Invalid verification code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSetupAt: new Date(),
      },
    });

    logAudit({ userId, action: 'mfa_enabled', entityType: 'user', entityId: userId, ipAddress });

    return { message: 'MFA enabled successfully' };
  }

  async verifyLoginMfa(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestError('MFA not configured');
    }

    const secret = decryptSecret(user.mfaSecret);
    if (!verifyTotp(secret, code)) {
      throw new UnauthorizedError('Invalid MFA code');
    }

    return true;
  }

  async verifyRecoveryCodeLogin(userId: string, code: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaEnabled) {
      throw new BadRequestError('MFA not configured');
    }

    const { valid, index } = await verifyRecoveryCode(code, user.mfaRecoveryCodes);
    if (!valid) {
      throw new UnauthorizedError('Invalid recovery code');
    }

    // Remove the used recovery code
    const updatedCodes = [...user.mfaRecoveryCodes];
    updatedCodes.splice(index, 1);
    await prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryCodes: updatedCodes },
    });

    logAudit({
      userId,
      action: 'mfa_recovery_code_used',
      entityType: 'user',
      entityId: userId,
      metadata: { remainingCodes: updatedCodes.length },
      ipAddress,
    });

    return true;
  }

  async disableMfa(userId: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (!user.mfaEnabled) throw new BadRequestError('MFA is not enabled');

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: [],
        mfaSetupAt: null,
      },
    });

    logAudit({ userId, action: 'mfa_disabled', entityType: 'user', entityId: userId, ipAddress });

    return { message: 'MFA disabled successfully' };
  }

  async createMfaToken(userId: string): Promise<string> {
    const token = `mfa_${crypto.randomBytes(32).toString('hex')}`;
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });
    return token;
  }

  async validateMfaToken(token: string): Promise<string> {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date() || !token.startsWith('mfa_')) {
      throw new UnauthorizedError('Invalid or expired MFA token');
    }
    // Delete the token after use
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return stored.userId;
  }
}

export const mfaService = new MfaService();
