import type { UserMeResponseDto } from '@/api/generated/model';
import { navGroups } from '@/config/nav-config';
import { filterNavItems } from '@/hooks/use-nav';
import { hasPermission } from '@/lib/rbac';

export function getPreferredLandingRoute(user: UserMeResponseDto | null | undefined): string {
  if (!user) return '/auth/sign-in';

  const allowedItems = filterNavItems(
    navGroups.flatMap((g) => g.items),
    user
  );

  if (allowedItems.length > 0 && allowedItems[0].url) {
    return allowedItems[0].url;
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
