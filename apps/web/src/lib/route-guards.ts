import { redirect } from 'next/navigation';
import { anyOf, hasPermission, type PermissionedUser } from './rbac';

/**
 * Client-side: call from "use client" component after auth store initialized.
 * Server-side: pass user fetched from /me.
 */
export function ensurePermission(
  user: PermissionedUser | null | undefined,
  perm: string,
  redirectTo = '/unauthorized'
): void {
  if (!hasPermission(user, perm)) {
    redirect(`${redirectTo}?missing=${encodeURIComponent(perm)}`);
  }
}

export function ensureAnyPermission(
  user: PermissionedUser | null | undefined,
  perms: string[],
  redirectTo = '/unauthorized'
): void {
  if (!anyOf(user, perms)) {
    redirect(`${redirectTo}?missingAnyOf=${encodeURIComponent(perms.join(','))}`);
  }
}
