'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { fetchNav } from '../api/nav-api';
import { createKeyFactory } from '@/lib/query-keys';

const navKeys = createKeyFactory('nav');

export function useNav() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...navKeys.all(), userId],
    queryFn: fetchNav,
    staleTime: 5 * 60_000, // 5 min — nav rarely changes
    gcTime: 30 * 60_000,
    enabled: !!userId,
    select: (data) => data.groups,
  });
}
