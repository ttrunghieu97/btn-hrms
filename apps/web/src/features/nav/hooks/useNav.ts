'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { fetchNav } from '../api/nav-api';
import type { NavResponse } from '../types/nav-types';
import { createKeyFactory } from '@/lib/query-keys';

export const navKeys = createKeyFactory('nav');

export function useNav(initialData?: NavResponse) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...navKeys.all(), userId],
    queryFn: () => fetchNav(),
    staleTime: 10 * 60_000, // 10 min — nav tree is static per user session
    gcTime: 60 * 60_000,
    enabled: !!userId,
    initialData,
    select: (data: NavResponse) => data.groups,
  });
}
