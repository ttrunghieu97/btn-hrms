import {
  EmployeeDetailPage,
  employeeKeys,
  timelineKeys,
  contractKeys,
  type ContractData,
  type TimelineEventDto
} from '@/features/employees';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireAnyPageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { getQueryClient } from '@/lib/query-client';
import { employeesControllerFindOne, employeeContractsControllerGet } from '@/api/generated/endpoints';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.employees.title),
  description: pageCopy.dashboard.employees.description,
};

type PageProps = {
  params: Promise<{ employeeId: string }>;
};

export default async function EmployeeDetailPageRoute(props: PageProps) {
  const { employeeId } = await props.params;
  await requireAnyPageAccess([
    permissions.employees.view,
    permissions.employees.viewSelf,
    permissions.employees.viewDepartment,
    permissions.employees.viewAll,
  ]);

  const queryClient = getQueryClient();
  const cookieHeader = (await cookies()).toString();
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined;

  try {
    // 1. Prefetch Employee Detail
    await queryClient.fetchQuery({
      queryKey: employeeKeys.detail(employeeId),
      queryFn: ({ signal }) =>
        employeesControllerFindOne(
          employeeId,
          {},
          {
            signal,
            headers,
          },
        ),
    });

    // 2. Prefetch Current Contract
    await queryClient.fetchQuery({
      queryKey: contractKeys.current(employeeId),
      queryFn: async () => {
        const response = await employeeContractsControllerGet(employeeId, { headers });
        return unwrapData<ContractData>(response);
      },
    });

    // 3. Prefetch Latest Timeline Activity (limit: 5)
    await queryClient.fetchQuery({
      queryKey: timelineKeys.list({ employeeId, limit: 5 }),
      queryFn: async () => {
        const response = await customFetch<TimelineEventDto[]>(
          `/api/v1/employees/${employeeId}/timeline?limit=5`,
          { headers }
        );
        return unwrapData(response);
      },
    });
  } catch {
    // prefetch best-effort
  }

  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    }>
      <EmployeeDetailPage employeeId={employeeId} />
    </Suspense>
  );
}
