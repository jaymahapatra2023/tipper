'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { UserRole } from '@tipper/shared';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContext {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: User; accessToken: string }>('/auth/login', {
      email,
      password,
    });
    if (res.success && res.data) {
      api.setToken(res.data.accessToken);
      setUser(res.data.user);
    } else {
      throw new Error(res.error?.message || 'Login failed');
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.post<{ user: User; accessToken: string }>('/auth/register', {
      email,
      password,
      name,
    });
    if (res.success && res.data) {
      api.setToken(res.data.accessToken);
      setUser(res.data.user);
    } else {
      throw new Error(res.error?.message || 'Registration failed');
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    api.setToken(null);
    setUser(null);
  }, []);

  return <AuthContext value={{ user, isLoading, login, register, logout }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
