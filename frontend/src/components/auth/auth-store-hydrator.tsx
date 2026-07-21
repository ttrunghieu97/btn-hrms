'use client';

import * as React from 'react';
import type { UserMeResponseDto } from '@/api/generated/model';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthStoreHydrator({
  user,
  children
}: {
  user: UserMeResponseDto;
  children: React.ReactNode;
}) {
  const hydrated = React.useRef(false);

  // Synchronous server hydration during initial render phase
  if (!hydrated.current) {
    hydrated.current = true;
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        useAuthStore.setState({ user, initialized: true });
      }, 0);
    } else {
      useAuthStore.setState({ user, initialized: true });
    }
  }

  return <>{children}</>;
}
