import type { UserMeResponseDto } from '@/api/generated/model';
import { navGroups } from '@/config/nav-config';
import { filterNavItems } from '@/hooks/use-nav';

/**
 * Navigate to first accessible nav item after login.
 * Fallback:
 *   - /account/profile (auth-only) if user has some permissions
 *   - /account/no-permissions if user has zero permissions
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

  // Has some permissions but none match nav → safe profile
  return '/account/profile';
}
