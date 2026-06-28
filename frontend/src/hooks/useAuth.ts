'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface WabaAccount {
  id: string;
  name: string;
  phoneNumberId: string;
  businessAccountId: string;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  organizationId: string;
  wabaAccounts: WabaAccount[];
}

const USER_STORAGE_KEY = 'bizlinbox:user';

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.user as User;
      setUser(userData);
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Redirect unauthenticated users away from protected pages
  useEffect(() => {
    if (!loading && user === null) {
      const publicPaths = ['/login', '/register', '/setup', '/accept-invite'];
      const isPublic = publicPaths.some((path) =>
        typeof window !== 'undefined' && window.location.pathname.startsWith(path)
      );
      if (!isPublic && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [loading, user]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.user as User;
      setUser(userData);
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore logout errors
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('bizlinbox:')) {
            localStorage.removeItem(key);
          }
        });
        window.location.href = '/login';
      }
    }
  }, []);

  return { user, loading, logout, refreshUser, setUser };
}
