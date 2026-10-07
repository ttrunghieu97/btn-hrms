import { EmployeesTable } from '@/features/employees';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function EmployeesPage() {
  await requireServerSession();
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    }>
      <EmployeesTable />
    </Suspense>
  );
}
