import { EmployeeCreatePage } from '@/features/employees';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireAnyPageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.employeesNew.title),
};

export default async function EmployeeCreatePageRoute() {
  await requireAnyPageAccess([
    permissions.employees.create,
  ]);

  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    }>
      <EmployeeCreatePage />
    </Suspense>
  );
}
