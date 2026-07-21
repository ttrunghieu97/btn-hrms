import { NotificationsPage } from '@/features/notifications';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.notifications.title),
  description: pageCopy.dashboard.notifications.description
};

export default async function AccountNotificationsPage() {
  await requirePageAccess(permissions.notifications.view);
  return <NotificationsPage />;
}
