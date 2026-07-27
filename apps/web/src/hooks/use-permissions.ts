/**
 * usePermissions hook.
 * Provides hierarchy-aware permission checkers bound to current auth user.
 *
 * Usage:
 *   const { hasPermission, can } = usePermissions();
 *   if (hasPermission('employee:view')) { ... }
 *   if (can({ anyOf: ['employee:view', 'employee:manage'] })) { ... }
 */
'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission as checkPerm, hasAnyPermission, hasAllPermissions } from '@project/permissions';
import { can as canCheck, type PermissionRule } from '@/lib/permission-resolver';
import { isSuperAdmin as checkSuper } from '@/lib/rbac';

export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const perms = user?.permissions ?? [];
  const superAdmin = checkSuper(user);

  const hasPermission = useCallback(
    (perm: string): boolean => superAdmin || checkPerm(perms, perm),
    [perms, superAdmin],
  );

  const hasAny = useCallback(
    (required: string[]): boolean => superAdmin || hasAnyPermission(perms, required),
    [perms, superAdmin],
  );

  const hasAll = useCallback(
    (required: string[]): boolean => superAdmin || hasAllPermissions(perms, required),
    [perms, superAdmin],
  );

  const can = useCallback(
    (rule: PermissionRule): boolean => superAdmin || canCheck(user, rule),
    [user, superAdmin],
  );

  return {
    hasPermission,
    hasAnyPermission: hasAny,
    hasAllPermissions: hasAll,
    can,
    isSuperAdmin: superAdmin,
  };
}
