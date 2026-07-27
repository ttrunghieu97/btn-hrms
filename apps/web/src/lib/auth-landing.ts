import type { UserMeResponseDto } from '@/api/generated/model';
import { navGroups } from '@/config/nav-config';
import { filterNavItems } from '@/hooks/use-nav';
import { hasPermission } from '@/lib/rbac';

/**
 * Navigate to first accessible nav item after login.
 * Fallback:
 *   - /account/no-permissions if user has zero permissions
 *   - /account/profile (auth-only) if user has some permissions
 *   - /overview if user has dashboard:view
 */
export function getPreferredLandingRoute(user: UserMeResponseDto | null | undefined): string {
  if (!user) return '/auth/sign-in';

  const allowedItems = filterNavItems(
    navGroups.flatMap((g) => g.items),
    user
  );

  if (allowedItems.length > 0 && allowedItems[0].url) {
    return allowedItems[0].url;
  }

  // User has no accessible nav items → check if they have zero permissions
  const perms = user.permissions;
  if (!perms || perms.length === 0) {
    return '/account/no-permissions';
  }

  // Try fallback pages — verify permission before redirecting
  const fallbacks: [string, string][] = [
    ['/account/profile', 'employees:view:self'],
    ['/overview', 'dashboard:view'],
  ];
  for (const [url, perm] of fallbacks) {
    if (hasPermission(user, perm)) {
      return url;
    }
  }

  // Last resort: user truly has zero permissions
  return '/account/profile';
}
