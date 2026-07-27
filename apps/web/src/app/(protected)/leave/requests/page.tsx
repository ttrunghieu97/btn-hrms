import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { permissions } from '@/lib/permissions';
import { LeaveRequestsPageClient } from '@/features/leave/components/leave-requests-page-client';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.leaveRequests),
};

export default async function LeaveRequestsPage() {
  await requireServerSession();
  return <LeaveRequestsPageClient />;
}
