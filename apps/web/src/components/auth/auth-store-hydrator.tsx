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
  React.useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      useAuthStore.getState().hydrateFromServer(user);
    }
  }, [user]);

  return <>{children}</>;
}


