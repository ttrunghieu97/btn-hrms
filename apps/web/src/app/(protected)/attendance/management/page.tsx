import { redirect } from 'next/navigation';
import { requireServerSession } from '@/lib/server/auth-session';

export default async function AttendanceManagementRootPage() {
  await requireServerSession();

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  redirect(`/attendance/management/periods/${currentPeriod}`);
}
