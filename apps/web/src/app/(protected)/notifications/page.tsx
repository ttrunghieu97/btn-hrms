import { NotificationsPage as NotificationsView } from '@/features/notifications';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: 'Notifications',
  description: 'Stay updated on approvals, tasks, and system events',
};

export default async function Page() {
  await requirePageAccess(permissions.notifications.view);
  return <NotificationsView />;
}
