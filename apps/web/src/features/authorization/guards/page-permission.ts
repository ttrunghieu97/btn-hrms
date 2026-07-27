/**
 * SSR page permission guard.
 * Secondary enforcement behind middleware.
 * Must be called from the protected layout, NOT individual pages.
 */
import { redirect } from 'next/navigation';
import { canAccessRoute } from '@/shared/authorization';
import type { PermissionedUser } from '@project/permissions';

export function requirePagePermission(
  pathname: string,
  user: PermissionedUser | null | undefined,
): void {
  if (!user) {
    redirect('/auth/sign-in');
  }

  if (!canAccessRoute(pathname, user.permissions)) {
    redirect('/unauthorized?missing=dashboard:view');
  }
}
