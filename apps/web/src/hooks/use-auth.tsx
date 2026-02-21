'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { UserRole } from '@tipper/shared';

interface HotelBranding {
  id: string;
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hotel?: HotelBranding | null;
}

interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
}

interface LoginResult {
  user: User;
  needsMfaSetup?: boolean;
}

interface AuthContext {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult | MfaChallenge>;
  verifyMfa: (mfaToken: string, code: string) => Promise<User>;
  verifyMfaRecovery: (mfaToken: string, recoveryCode: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only attempt to fetch current user if we have a token
    if (!api.hasToken()) {
      setIsLoading(false);
      return;
    }
    api
      .get<User>('/auth/me')
      .then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
        }
      })
      .catch(() => {
        // Token expired or invalid — clear it
        api.setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult | MfaChallenge> => {
      const res = await api.post<{
        user?: User;
        accessToken?: string;
        mfaRequired?: boolean;
        mfaToken?: string;
        needsMfaSetup?: boolean;
      }>('/auth/login', { email, password });

      if (res.success && res.data) {
        if (res.data.mfaRequired && res.data.mfaToken) {
          return { mfaRequired: true, mfaToken: res.data.mfaToken };
        }
        if (res.data.accessToken) {
          api.setToken(res.data.accessToken);
        }
        if (res.data.user) {
          setUser(res.data.user);
          return { user: res.data.user, needsMfaSetup: res.data.needsMfaSetup };
        }
      }
      throw new Error(res.error?.message || 'Login failed');
    },
    [],
  );

  const verifyMfa = useCallback(async (mfaToken: string, code: string): Promise<User> => {
    const res = await api.post<{ user: User; accessToken: string }>('/auth/mfa/verify', {
      mfaToken,
      code,
    });
    if (res.success && res.data) {
      api.setToken(res.data.accessToken);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.error?.message || 'MFA verification failed');
  }, []);

  const verifyMfaRecovery = useCallback(
    async (mfaToken: string, recoveryCode: string): Promise<User> => {
      const res = await api.post<{ user: User; accessToken: string }>('/auth/mfa/recovery', {
        mfaToken,
        recoveryCode,
      });
      if (res.success && res.data) {
        api.setToken(res.data.accessToken);
        setUser(res.data.user);
        return res.data.user;
      }
      throw new Error(res.error?.message || 'Recovery code verification failed');
    },
    [],
  );

  const register = useCallback(
    async (email: string, password: string, name: string): Promise<User> => {
      const res = await api.post<{ user: User; accessToken: string }>('/auth/register', {
        email,
        password,
        name,
      });
      if (res.success && res.data) {
        api.setToken(res.data.accessToken);
        setUser(res.data.user);
        return res.data.user;
      } else {
        throw new Error(res.error?.message || 'Registration failed');
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    api.setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext value={{ user, isLoading, login, verifyMfa, verifyMfaRecovery, register, logout }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
