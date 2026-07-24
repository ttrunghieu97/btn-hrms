import { customFetch } from '@/lib/fetcher';
import type { NavResponse } from '../types/nav-types';

/**
 * Fetch navigation tree for the current user.
 * The server filters items based on user permissions.
 */
export async function fetchNav(options?: { headers?: Record<string, string> }): Promise<NavResponse> {
  const res = await customFetch<{ data: { data: NavResponse } }>('/api/v1/nav', options);
  return res.data.data;
}

