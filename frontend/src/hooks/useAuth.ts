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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  return { user, loading, logout };
}
