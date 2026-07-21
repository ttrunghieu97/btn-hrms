import { DocumentsView } from '@/features/employees';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { requireAnyPageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.documents),
};

export default async function EmployeeDocumentsPage() {
  await requireAnyPageAccess([
    permissions.employees.view,
    permissions.employees.viewSelf,
    permissions.employees.viewDepartment,
    permissions.employees.viewAll,
  ]);
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    }>
      <DocumentsView />
    </Suspense>
  );
}
