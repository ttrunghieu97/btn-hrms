/**
 * SSR page permission guard.
 * Secondary enforcement behind middleware.
 * Must be called from the protected layout, NOT individual pages.
 */
import { redirect } from 'next/navigation';
import { can } from '@/lib/permission-resolver';
import { resolveRoutePermission } from '../utils/route-resolver';
import type { PermissionedUser } from '@project/permissions';

export function requirePagePermission(
  pathname: string,
  user: PermissionedUser | null | undefined,
): void {
  if (!user) {
    redirect('/auth/sign-in');
  }

  const rule = resolveRoutePermission(pathname);
  if (!rule) return;

  if (!rule.anyOf?.length && !rule.allOf?.length && !rule.not?.length) return;

  if (!can(user, rule)) {
    const label = rule.anyOf?.join(',') ?? rule.allOf?.join(',') ?? 'access';
    redirect(`/unauthorized?missing=${encodeURIComponent(label)}`);
  }
}
