import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { cookies } from 'next/headers';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { taskKeys, tasksQueryOptions } from '../queries/task-queries';
import { TasksTabsView } from './tasks-tabs-view';
import type { TasksControllerListParams } from '@/api/generated/model';

export default async function TaskListingPage() {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('search');
  const pageLimit = searchParamsCache.get('perPage');
  const status = searchParamsCache.get('status');

  const filters: TasksControllerListParams = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(status && { status: status as TasksControllerListParams['status'] })
  };

  const queryClient = getQueryClient();
  const cookieHeader = (await cookies()).toString();

  try {
    await queryClient.fetchQuery(
      tasksQueryOptions(filters, {
        headers: cookieHeader ? { cookie: cookieHeader } : undefined
      })
    );
  } catch {
    queryClient.removeQueries({ queryKey: taskKeys.list(filters) });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksTabsView />
    </HydrationBoundary>
  );
}
