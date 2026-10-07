import { TimesheetEditorPage } from '@/features/attendance';
import { requireServerSession } from '@/lib/server/auth-session';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PeriodPageProps {
  params: Promise<{
    period: string;
  }>;
}

export default async function PeriodManagementPage({ params }: PeriodPageProps) {
  await requireServerSession();
  const { period } = await params;

  // Validate YYYY-MM period format
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)) {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    redirect(`/attendance/management/periods/${currentPeriod}`);
  }

  return (
    <Suspense fallback={<Skeleton className='h-[400px] w-full' />}>
      <TimesheetEditorPage defaultPeriod={period} />
    </Suspense>
  );
}
