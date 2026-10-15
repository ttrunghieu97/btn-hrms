import { GpsLogsView } from '@/features/attendance';
import { requireServerSession } from '@/lib/server/auth-session';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AttendanceGpsLogsPage() {
  await requireServerSession();

  return (
    <Suspense fallback={<Skeleton className='h-[400px] w-full' />}>
      <GpsLogsView />
    </Suspense>
  );
}
