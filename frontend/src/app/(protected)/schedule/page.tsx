import { redirect } from 'next/navigation';
import { HydrationBoundary } from '@tanstack/react-query';
import { CalendarView } from '@/features/schedule';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { prefetchSchedulePage } from '@/features/shifts/server';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function SchedulePage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab;

  if (tab === 'management') redirect('/schedule/management');
  if (tab === 'roster') redirect('/schedule/roster');
  if (tab === 'requests') redirect('/schedule/requests');
  if (tab === 'my-schedule') redirect('/schedule/my-schedule');

  await requirePageAccess(permissions.schedule.view);

  const { dehydratedState } = await prefetchSchedulePage(searchParams);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<Skeleton className='h-[400px] w-full' />}>
        <CalendarView />
      </Suspense>
    </HydrationBoundary>
  );
}
