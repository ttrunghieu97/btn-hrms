import { NotificationsPage as NotificationsView } from '@/features/notifications';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: 'Notifications',
  description: 'Stay updated on approvals, tasks, and system events',
};

export default async function Page() {
  await requireServerSession();
  return <NotificationsView />;
}
