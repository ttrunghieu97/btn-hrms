import { EmployeesTable, EmployeesTableSkeleton } from '@/features/employees';
import { requireServerSession } from '@/lib/server/auth-session';
import { Suspense } from 'react';

export default async function EmployeesPage() {
  await requireServerSession();
  return (
    <Suspense fallback={<EmployeesTableSkeleton />}>
      <EmployeesTable />
    </Suspense>
  );
}
