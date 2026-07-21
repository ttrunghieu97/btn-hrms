import { customFetch } from '@/lib/fetcher';
import type { NavResponse } from '../types/nav-types';

/**
 * Fetch navigation tree for the current user.
 * The server filters items based on user permissions.
 */
export async function fetchNav(): Promise<NavResponse> {
  const res = await customFetch<{ data: { data: NavResponse } }>('/api/v1/nav');
  return res.data.data;
}
