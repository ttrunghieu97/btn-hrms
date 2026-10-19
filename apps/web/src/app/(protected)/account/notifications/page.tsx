import { NotificationsPage } from '@/features/notifications';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.notifications.title),
  description: pageCopy.dashboard.notifications.description
};

export default async function AccountNotificationsPage() {
  await requireServerSession();
  return <NotificationsPage />;
}
