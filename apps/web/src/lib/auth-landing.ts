import type { UserMeResponseDto } from '@/api/generated/model';
import { navGroups } from '@/config/nav-config';
import { filterNavItems } from '@/hooks/use-nav';
import { hasPermission } from '@/lib/rbac';
import { canAccessRoute, PUBLIC_ROUTES } from '@/shared/authorization';

/**
 * Navigate to first accessible nav item after login.
 * Uses Fail-Fast check with canAccessRoute to guarantee destination is strictly accessible.
 */
export function getPreferredLandingRoute(user: UserMeResponseDto | null | undefined): string {
  if (!user) return PUBLIC_ROUTES.SIGN_IN;

  const allowedItems = filterNavItems(
    navGroups.flatMap((g) => g.items),
    user
  );

  for (const item of allowedItems) {
    if (item.url && canAccessRoute(item.url, user.permissions)) {
      return item.url;
    }
  }

  // User has no accessible nav items → check if they have zero permissions
  const perms = user.permissions;
  if (!perms || perms.length === 0) {
    return PUBLIC_ROUTES.ACCOUNT_NO_PERMISSIONS;
  }

  // Try fallback pages — verify permission before redirecting
  const fallbacks: [string, string][] = [
    ['/account/profile', 'employees:view:self'],
    ['/overview', 'dashboard:view'],
  ];
  for (const [url, perm] of fallbacks) {
    if (hasPermission(user, perm) && canAccessRoute(url, user.permissions)) {
      return url;
    }
  }

  // Last resort: Fail fast to account profile if accessible, else sign-in
  if (canAccessRoute('/account/profile', user.permissions)) {
    return '/account/profile';
  }

  return PUBLIC_ROUTES.ACCOUNT_NO_PERMISSIONS;
}
