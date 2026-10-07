import { ActivityCenter } from '@/components/platform/activity-center';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: 'Activity Center',
  description: 'Recent events, approvals, and system activity',
};

export default async function ActivityPage() {
  await requireServerSession();
  return <ActivityCenter />;
}
