import { redirect } from 'next/navigation';
import { MyAttendanceView } from '@/features/attendance';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AttendancePage() {
  redirect('/attendance/management/timesheet');
}
