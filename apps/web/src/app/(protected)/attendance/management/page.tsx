import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ManagementView } from '@/features/attendance';
import { requireServerSession } from '@/lib/server/auth-session';

export default async function AttendanceManagementRootPage() {
  await requireServerSession();

  return (
    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
      <ManagementView />
    </Suspense>
  );
}
