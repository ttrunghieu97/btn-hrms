import { redirect } from 'next/navigation';
import type { PermissionedUser } from '@project/permissions';
import { canAccessRoute, resolveRoutePermission } from '../utils/route-resolver';

/**
 * Server-side route access guard.
 * Replaces `requirePageAccess(perm)` pattern.
 *
 * Usage:
 *   export default async function Page() {
 *     await requireRouteAccess();
 *     return <PageContent />;
 *   }
 */
export async function requireRouteAccess(
  pathname?: string,
  user?: PermissionedUser | null,
): Promise<void> {
  // In SSR, can't access `window.location` — consumer passes pathname
  // For client-side, use the hook-based approach
  if (!pathname) {
    throw new Error('requireRouteAccess requires a pathname in server components');
  }

  if (!user) {
    redirect('/auth/sign-in');
  }

  const rule = resolveRoutePermission(pathname);
  if (!rule) return; // unknown route → allow

  // Guard uses the compound checker
  const { can } = await import('@/lib/permission-resolver');
  if (!can(user, rule)) {
    const label = Object.entries(rule)
      .filter(([, v]) => v?.length)
      .map(([k, v]) => `${k}=${(v as string[]).join(',')}`)
      .join('&');
    redirect(`/unauthorized?missing=${encodeURIComponent(label || 'access')}`);
  }
}
