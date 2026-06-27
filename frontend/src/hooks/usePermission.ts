'use client';

import { useAuth } from './useAuth';

export function usePermission() {
  const { user, loading } = useAuth();
  const permissions = user?.permissions || [];

  const can = (...required: string[]) =>
    required.some((p) => permissions.includes(p));

  const canAll = (...required: string[]) =>
    required.every((p) => permissions.includes(p));

  const isAdmin = can('users.manage');

  return { can, canAll, isAdmin, permissions, loading };
}
