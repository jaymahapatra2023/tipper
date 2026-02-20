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
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors';

export class AuthService {
  async register(email: string, password: string, name: string, role: UserRole = UserRole.GUEST) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role as UserRole };

    // If staff or admin, include hotelId
    if (user.role === 'hotel_admin') {
      const ha = await prisma.hotelAdmin.findFirst({ where: { userId: user.id } });
      if (ha) payload.hotelId = ha.hotelId;
    } else if (user.role === 'staff') {
      const sm = await prisma.staffMember.findFirst({ where: { userId: user.id } });
      if (sm) payload.hotelId = sm.hotelId;
    }

    const tokens = await this.generateTokens(payload);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    };
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

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Don't reveal if user exists

    // Generate reset token (store as refresh token with short expiry for simplicity)
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.refreshToken.create({
      data: {
        token: `reset_${token}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send reset email via SES
    console.log(`Password reset token for ${email}: ${token}`);
  }

  async resetPassword(token: string, newPassword: string) {
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
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundError('User');
    return user;
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
