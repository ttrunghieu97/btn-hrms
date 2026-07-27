/**
 * usePermissions hook.
 * Provides hierarchy-aware permission checkers bound to current auth user.
 *
 * Usage:
 *   const { hasPermission, can } = usePermissions();
 *   if (hasPermission('employee:view')) { ... }
 *   if (can({ anyOf: ['employee:view', 'employee:manage'] })) { ... }
 *
 * `sys:all` root permission is handled by the shared resolver — no local
 * super-admin short-circuit needed.
 */
'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@project/permissions';
import { can as canCheck, type PermissionRule } from '@/lib/permission-resolver';
import { isSuperAdmin } from '@/lib/rbac';

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const perms = user?.permissions ?? [];

  const hPerm = useCallback(
    (perm: string): boolean => hasPermission(perms, perm),
    [perms],
  );

  const hAny = useCallback(
    (required: string[]): boolean => hasAnyPermission(perms, required),
    [perms],
  );

  const hAll = useCallback(
    (required: string[]): boolean => hasAllPermissions(perms, required),
    [perms],
  );

  const hCan = useCallback(
    (rule: PermissionRule): boolean => canCheck(user, rule),
    [user],
  );

  return {
    hasPermission: hPerm,
    hasAnyPermission: hAny,
    hasAllPermissions: hAll,
    can: hCan,
    isSuperAdmin: isSuperAdmin(user),
  };
}
