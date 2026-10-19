import { useQuery } from '@tanstack/react-query';
import { fetchOffboardingList, fetchOffboardingDetail } from '../api/offboarding-client';

export function useOffboardingList(page = 1, limit = 20, status?: string | null) {
  return useQuery({
    queryKey: ['offboarding', 'list', { page, limit, status: status ?? null }],
    queryFn: () => fetchOffboardingList(page, limit, status),
  });
}

export function useOffboardingDetail(id: string) {
  return useQuery({
    queryKey: ['offboarding', 'detail', id],
    queryFn: () => fetchOffboardingDetail(id),
    enabled: !!id,
  });
}
