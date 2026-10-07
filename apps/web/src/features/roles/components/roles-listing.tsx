import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { cookies } from 'next/headers';
import { getQueryClient } from '@/lib/query-client';
import { rolesQueryOptions, roleKeys } from '../api/queries';
import { RolesTable } from './roles-table';

export default async function RolesListingPage() {
  const queryClient = getQueryClient();
  const cookieHeader = (await cookies()).toString();

  try {
    await queryClient.fetchQuery({
      ...rolesQueryOptions,
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    } as any);
  } catch {
    queryClient.removeQueries({ queryKey: roleKeys.all() });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RolesTable />
    </HydrationBoundary>
  );
}
