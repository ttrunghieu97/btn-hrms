import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { getUsersWithRequest } from './service';
import type { User, UserFilters } from './types';

export type { User };

const root = createKeyFactory<UserFilters>('users');

export const userKeys = {
  ...root,
  search: (term: string) => [...root.all(), 'search', term] as const
};

export const userInvalidations = {
  list: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: userKeys.lists() });
  },
  detail: async (queryClient: QueryClient, id: string) => {
    await queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
  },
  all: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: userKeys.all() });
  }
};

export const usersQueryOptions = (filters: UserFilters, requestInit?: RequestInit) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: userKeys.list(filters),
    queryFn: () => getUsersWithRequest(filters, requestInit),
  });
