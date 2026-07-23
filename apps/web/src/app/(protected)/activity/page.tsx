import { ActivityCenter } from '@/components/platform/activity-center';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: 'Activity Center',
  description: 'Recent events, approvals, and system activity',
};

export default async function ActivityPage() {
  await requirePageAccess(permissions.dashboard.view);
  return <ActivityCenter />;
}
