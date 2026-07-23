import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { userKeys, usersQueryOptions } from '../api/queries';
import { UsersTable } from './users-table';
import { cookies } from 'next/headers';

export default async function UserListingPage() {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('name');
  const pageLimit = searchParamsCache.get('perPage');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();
  const cookieHeader = (await cookies()).toString();

  try {
    await queryClient.fetchQuery(
      usersQueryOptions(filters, {
        headers: cookieHeader ? { cookie: cookieHeader } : undefined
      })
    );
  } catch {
    queryClient.removeQueries({ queryKey: userKeys.list(filters) });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersTable />
    </HydrationBoundary>
  );
}
