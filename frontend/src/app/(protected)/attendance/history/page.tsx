import { HistoryView } from '@/features/attendance';
import { requireAnyPageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AttendanceHistoryPage() {
  await requireAnyPageAccess([
    permissions.attendance.view,
    permissions.attendance.viewDepartment,
    permissions.attendance.viewAll,
  ]);

  return (
    <Suspense fallback={<Skeleton className='h-[400px] w-full' />}>
      <HistoryView />
    </Suspense>
  );
}
