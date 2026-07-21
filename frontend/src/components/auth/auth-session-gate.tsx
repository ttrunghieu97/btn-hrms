'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { UserMeResponseDto } from '@/api/generated/model';
import { authSessionGateCopy } from '@/locales/vi/system-ui';
import { appLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthSessionGate({
  children,
  initialUser
}: {
  children: React.ReactNode;
  initialUser?: UserMeResponseDto;
}) {
  const router = useRouter();
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const hasSeededUser = Boolean(initialUser);
  const effectiveUser = user ?? initialUser ?? null;
  const shouldBootstrap = !hasSeededUser && (!initialized || !user);
  const [bootstrapping, setBootstrapping] = React.useState(shouldBootstrap);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__BONEYARD_BUILD) {
      setBootstrapping(false);
      return;
    }
    if (!shouldBootstrap) {
      setBootstrapping(false);
      return;
    }

    appLogger.debug('auth_gate_bootstrap_required', {
      source: 'auth-gate',
      path: window.location.pathname,
      initialized,
      hasUser: Boolean(user)
    });

    let active = true;

    void (async () => {
      try {
        const currentUser = await bootstrapSession();
        if (!active) return;
        if (!currentUser) {
          appLogger.warn('auth_gate_redirect_sign_in', {
            source: 'auth-gate',
            path: window.location.pathname,
            reason: 'bootstrap_returned_null'
          });
          router.replace('/auth/sign-in');
          return;
        }

        appLogger.debug('auth_gate_bootstrap_succeeded', {
          source: 'auth-gate',
          path: window.location.pathname,
          userId: currentUser.id
        });
      } finally {
        if (active) setBootstrapping(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [bootstrapSession, router, shouldBootstrap]);

  if (bootstrapping || (!hasSeededUser && loading) || !effectiveUser) {
    return (
      <div className='text-muted-foreground flex min-h-screen items-center justify-center text-sm'>
        {authSessionGateCopy.restoringSession}
      </div>
    );
  }

  return <>{children}</>;
}

