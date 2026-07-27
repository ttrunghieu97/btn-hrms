import { redirect } from 'next/navigation';
import { hasPermission, hasAnyPermission } from '@project/permissions';
import type { PermissionedUser } from './rbac';

/**
 * Client-side: call from "use client" component after auth store initialized.
 * Server-side: pass user fetched from /me.
 */
export function ensurePermission(
  user: PermissionedUser | null | undefined,
  perm: string,
  redirectTo = '/unauthorized'
): void {
  if (!hasPermission(user?.permissions ?? [], perm)) {
    redirect(`${redirectTo}?missing=${encodeURIComponent(perm)}`);
  }
}

export function ensureAnyPermission(
  user: PermissionedUser | null | undefined,
  perms: string[],
  redirectTo = '/unauthorized'
): void {
  if (!hasAnyPermission(user?.permissions ?? [], perms)) {
    redirect(`${redirectTo}?missingAnyOf=${encodeURIComponent(perms.join(','))}`);
  }
}
