import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@tipper/database';
import {
  UserRole,
  PASSWORD_SALT_ROUNDS,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
} from '@tipper/shared';
import type { JwtPayload } from '@tipper/shared';

import { env } from '../config/env';
import { emailService } from './email.service';
import { mfaService } from './mfa.service';
import { logAudit } from '../utils/audit';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors';

export class AuthService {
  async register(
    email: string,
    password: string,
    name: string,
    role: UserRole = UserRole.GUEST,
    ipAddress?: string,
  ) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    logAudit({
      userId: user.id,
      action: 'user_register',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return { user, ...tokens };
  }

  async login(email: string, password: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      logAudit({
        action: 'login_failure',
        entityType: 'auth',
        metadata: { email, reason: 'invalid_credentials' },
        ipAddress,
      });
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!user.isActive) {
      logAudit({
        userId: user.id,
        action: 'login_failure',
        entityType: 'auth',
        metadata: { reason: 'account_deactivated' },
        ipAddress,
      });
      throw new UnauthorizedError('Account is deactivated');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logAudit({
        userId: user.id,
        action: 'login_failure',
        entityType: 'auth',
        metadata: { reason: 'invalid_credentials' },
        ipAddress,
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      const mfaToken = await mfaService.createMfaToken(user.id);
      return {
        mfaRequired: true,
        mfaToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    }

    // Check if hotel requires MFA and user hasn't set it up
    const needsMfaSetup = await this.checkHotelMfaRequirement(user);
    if (needsMfaSetup) {
      const tokens = await this.generateTokensForUser(user);
      logAudit({ userId: user.id, action: 'login_success', entityType: 'auth', ipAddress });
      return {
        needsMfaSetup: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        ...tokens,
      };
    }

    const tokens = await this.generateTokensForUser(user);

    logAudit({ userId: user.id, action: 'login_success', entityType: 'auth', ipAddress });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    };
  }

  async verifyMfa(mfaToken: string, code: string, ipAddress?: string) {
    const userId = await mfaService.validateMfaToken(mfaToken);
    await mfaService.verifyLoginMfa(userId, code);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');

    const tokens = await this.generateTokensForUser(user);
    logAudit({
      userId: user.id,
      action: 'login_success',
      entityType: 'auth',
      metadata: { mfa: true },
      ipAddress,
    });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    };
  }

  async verifyMfaRecovery(mfaToken: string, recoveryCode: string, ipAddress?: string) {
    const userId = await mfaService.validateMfaToken(mfaToken);
    await mfaService.verifyRecoveryCodeLogin(userId, recoveryCode, ipAddress);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');

    const tokens = await this.generateTokensForUser(user);
    logAudit({
      userId: user.id,
      action: 'login_success',
      entityType: 'auth',
      metadata: { mfa: true, recovery: true },
      ipAddress,
    });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    };
  }

  private async checkHotelMfaRequirement(user: { id: string; role: string; mfaEnabled: boolean }) {
    if (user.mfaEnabled) return false;

    let hotelId: string | null = null;
    if (user.role === 'hotel_admin') {
      const ha = await prisma.hotelAdmin.findFirst({ where: { userId: user.id } });
      hotelId = ha?.hotelId ?? null;
    } else if (user.role === 'staff') {
      const sm = await prisma.staffMember.findFirst({ where: { userId: user.id } });
      hotelId = sm?.hotelId ?? null;
    }

    if (!hotelId) return false;

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    return hotel?.mfaRequired ?? false;
  }

  async registerHotel(
    hotelName: string,
    name: string,
    email: string,
    password: string,
    ipAddress?: string,
  ) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

    // Create user + hotel + hotelAdmin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name, role: UserRole.HOTEL_ADMIN },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      const hotel = await tx.hotel.create({
        data: {
          name: hotelName,
          address: '',
          city: '',
          state: '',
          zipCode: '',
          phone: '',
          email,
          status: 'pending',
        },
      });

      await tx.hotelAdmin.create({
        data: { userId: user.id, hotelId: hotel.id, isPrimary: true },
      });

      return { user, hotel };
    });

    logAudit({
      userId: result.user.id,
      action: 'hotel_register',
      entityType: 'hotel',
      entityId: result.hotel.id,
      ipAddress,
    });

    const tokens = await this.generateTokens({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
      hotelId: result.hotel.id,
    });

    return { user: result.user, hotel: result.hotel, ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or deactivated');
    }

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role as UserRole };
    return this.generateTokens(payload);
  }

  async logout(refreshToken: string, userId?: string, ipAddress?: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    if (userId) {
      logAudit({ userId, action: 'logout', entityType: 'auth', ipAddress });
    }
  }

  async forgotPassword(email: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Don't reveal if user exists

    logAudit({ userId: user.id, action: 'password_reset_request', entityType: 'auth', ipAddress });

    // Delete old reset tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id, token: { startsWith: 'reset_' } },
    });

    // Generate reset token (store as refresh token with short expiry for simplicity)
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.refreshToken.create({
      data: {
        token: `reset_${token}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await emailService.sendPasswordResetEmail(user.email, user.name, token);
  }

  async resetPassword(token: string, newPassword: string, ipAddress?: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: `reset_${token}` } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    });

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    logAudit({
      userId: stored.userId,
      action: 'password_reset_complete',
      entityType: 'auth',
      ipAddress,
    });
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, mfaEnabled: true, createdAt: true },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  private async generateTokensForUser(user: { id: string; email: string; role: string }) {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    if (user.role === 'hotel_admin') {
      const ha = await prisma.hotelAdmin.findFirst({ where: { userId: user.id } });
      if (ha) payload.hotelId = ha.hotelId;
    } else if (user.role === 'staff') {
      const sm = await prisma.staffMember.findFirst({ where: { userId: user.id } });
      if (sm) payload.hotelId = sm.hotelId;
    }

    return this.generateTokens(payload);
  }

  private async generateTokens(payload: JwtPayload) {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRY,
    });

    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}

export const authService = new AuthService();
