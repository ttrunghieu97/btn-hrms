'use client';

import { cloneElement, isValidElement, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { canPerformAction } from '@/shared/authorization';

export type ActionGuardMode = 'hide' | 'disable' | 'fallback';

export interface ActionGuardProps {
  action: string;
  children: ReactNode;
  mode?: ActionGuardMode;
  fallback?: ReactNode;
}

export function ActionGuard({
  action,
  children,
  mode = 'hide',
  fallback = null,
}: ActionGuardProps) {
  const permissions = useAuthStore((state) => state.user?.permissions);
  const allowed = canPerformAction(action, permissions);

  if (allowed) {
    return <>{children}</>;
  }

  if (mode === 'disable') {
    if (isValidElement(children)) {
      return cloneElement(children as React.ReactElement<{ disabled?: boolean; 'aria-disabled'?: boolean }>, {
        disabled: true,
        'aria-disabled': true,
      });
    }
    return <>{children}</>;
  }

  if (mode === 'fallback') {
    return <>{fallback}</>;
  }

  // mode === 'hide'
  return null;
}
