import { ManagementView } from '@/features/schedule';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function ScheduleManagementPage() {
  await requirePageAccess(permissions.schedule.view);

  return (
    <Suspense fallback={<Skeleton className='h-[400px] w-full' />}>
      <ManagementView />
    </Suspense>
  );
}
