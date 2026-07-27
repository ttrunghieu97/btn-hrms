'use client';

import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessRoute } from '@/shared/authorization';

export interface CanAccessRouteProps {
  route: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanAccessRoute({ route, children, fallback = null }: CanAccessRouteProps) {
  const permissions = useAuthStore((state) => state.user?.permissions);
  const allowed = canAccessRoute(route, permissions);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
