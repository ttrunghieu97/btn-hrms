import { redirect } from 'next/navigation';
import { MyAttendanceView } from '@/features/attendance';
import { requireAnyPageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AttendancePage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab;

  if (tab === 'history') redirect('/attendance/history');
  if (tab === 'analytics') redirect('/attendance/analytics');
  if (tab === 'manage') redirect('/attendance/management');
  if (tab === 'timekeeping') redirect('/attendance/summary');

  await requireAnyPageAccess([
    permissions.attendance.view,
    permissions.attendance.viewDepartment,
    permissions.attendance.viewAll,
  ]);

  return (
    <Suspense fallback={<Skeleton className='h-[400px] w-full' />}>
      <MyAttendanceView />
    </Suspense>
  );
}
