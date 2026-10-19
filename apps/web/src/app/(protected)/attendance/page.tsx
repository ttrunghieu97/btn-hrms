import { MyAttendanceView } from '@/features/attendance';
import { requireServerSession } from '@/lib/server/auth-session';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AttendancePage() {
  await requireServerSession();
  return (
    <Suspense fallback={<Skeleton className='h-96 w-full' />}>
      <MyAttendanceView />
    </Suspense>
  );
}
