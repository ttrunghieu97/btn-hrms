'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/rbac';
import { useAuthStore } from '@/stores/auth-store';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
}

export default function PermissionGate({ permission, children }: PermissionGateProps) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);

  const allowed = hasPermission(user, permission);

  useEffect(() => {
    if (!loading && initialized && !allowed) {
      router.replace(`/unauthorized?missing=${encodeURIComponent(permission)}`);
    }
  }, [allowed, initialized, loading, permission, router]);

  if (!initialized || loading) {
    return null;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
