import { dehydrate, type QueryClient } from '@tanstack/react-query';
import { cookies } from 'next/headers';
import { startOfWeek, addDays, format } from 'date-fns';
import { getQueryClient } from '@/lib/query-client';
import {
  shiftsKeys,
  shiftsTemplatesQueryOptions,
  shiftsAssignmentsQueryOptions,
  shiftsRosterQueryOptions,
  type ShiftTemplateStatus,
} from './queries';
import { allRequestsQueryOptions, requestKeys } from './request-queries';
import { searchParamsCache } from '@/lib/searchparams';

function isShiftTemplateStatus(value: string): value is ShiftTemplateStatus {
  return value === 'draft' || value === 'published' || value === 'archived';
}

export function getShiftTemplateListFilters() {
  const page = searchParamsCache.get('page');
  const pageLimit = searchParamsCache.get('perPage');
  const search = searchParamsCache.get('search');
  const status = searchParamsCache.get('status');

  return {
    page: typeof page === 'number' && page > 0 ? page : 1,
    limit: typeof pageLimit === 'number' && pageLimit > 0 ? pageLimit : 10,
    ...(search ? { search } : {}),
    ...(status && isShiftTemplateStatus(status) ? { status } : {}),
  };
}

export async function prefetchSchedulePage(
  searchParams: any,
  queryClient: QueryClient = getQueryClient(),
) {
  const resolvedParams = await searchParams;
  searchParamsCache.parse(resolvedParams);
  const cookieHeader = (await cookies()).toString();
  const requestInit = cookieHeader ? { headers: { cookie: cookieHeader } } : undefined;

  // ── Overview tab: current week roster ──
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const rosterParams = {
    from: format(weekStart, 'yyyy-MM-dd'),
    to: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
  };

  try {
    await queryClient.fetchQuery(
      shiftsRosterQueryOptions(rosterParams, requestInit),
    );
  } catch {
    queryClient.removeQueries({ queryKey: shiftsKeys.roster(rosterParams) });
  }

  // ── Management tab: templates (first page) ──
  const templateFilters = getShiftTemplateListFilters();
  try {
    await queryClient.fetchQuery(
      shiftsTemplatesQueryOptions(templateFilters, requestInit),
    );
  } catch {
    queryClient.removeQueries({ queryKey: shiftsKeys.templates(templateFilters) });
  }

  // ── Management tab: assignments (first page) ──
  try {
    await queryClient.fetchQuery(
      shiftsAssignmentsQueryOptions({ limit: 10 }, requestInit),
    );
  } catch {
    queryClient.removeQueries({ queryKey: shiftsKeys.assignments({ limit: 10 }) });
  }

  // ── Requests / My-schedule tabs ──
  try {
    await queryClient.fetchQuery(allRequestsQueryOptions(undefined, requestInit));
  } catch {
    queryClient.removeQueries({ queryKey: requestKeys.all() });
  }

  return {
    queryClient,
    dehydratedState: dehydrate(queryClient),
  };
}
