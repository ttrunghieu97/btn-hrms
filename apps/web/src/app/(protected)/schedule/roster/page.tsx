import { RosterView } from '@/features/schedule';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function ScheduleRosterPage() {
  await requireServerSession();

  return (
    <Suspense fallback={<Skeleton className='h-[400px] w-full' />}>
      <RosterView />
    </Suspense>
  );
}
