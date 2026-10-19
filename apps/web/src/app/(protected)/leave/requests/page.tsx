import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { LeaveRequestsPageClient } from '@/features/leave';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.leaveRequests),
};

export default async function LeaveRequestsPage() {
  await requireServerSession();
  return <LeaveRequestsPageClient />;
}
