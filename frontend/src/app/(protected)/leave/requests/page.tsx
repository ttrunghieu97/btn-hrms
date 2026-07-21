import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { LeaveRequestsPageClient } from '@/features/leave/components/leave-requests-page-client';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.leaveRequests),
};

export default async function LeaveRequestsPage() {
  await requirePageAccess('leave:view:all');
  return <LeaveRequestsPageClient />;
}
