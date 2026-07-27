'use client';

import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessResource } from '@/shared/authorization';

export interface ResourceGuardProps {
  resource: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ResourceGuard({ resource, children, fallback = null }: ResourceGuardProps) {
  const permissions = useAuthStore((state) => state.user?.permissions);
  const allowed = canAccessResource(resource, permissions);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
