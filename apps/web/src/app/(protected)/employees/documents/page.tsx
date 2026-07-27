import { DocumentsView } from '@/features/employees';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.documents),
};

export default async function EmployeeDocumentsPage() {
  await requireServerSession();
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
