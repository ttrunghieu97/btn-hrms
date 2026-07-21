import { cache } from 'react';
import type { UserMeResponseDto } from '@/api/generated/model';
import { ensureAnyPermission, ensurePermission } from '@/lib/route-guards';
import type { PermissionValue } from '@/lib/permissions';
import { requireServerSession } from '@/lib/server/auth-session';

const getCurrentUserFromServer = cache(async (): Promise<UserMeResponseDto> => {
  return requireServerSession();
});

export async function requirePageAccess(permission: PermissionValue): Promise<UserMeResponseDto> {
  const user = await getCurrentUserFromServer();
  ensurePermission(user, permission);
  return user;
}

export async function requireAnyPageAccess(permissions: PermissionValue[]): Promise<UserMeResponseDto> {
  const user = await getCurrentUserFromServer();
  ensureAnyPermission(user, permissions);
  return user;
}
