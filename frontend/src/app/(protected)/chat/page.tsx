import { ChatViewPage } from '@/features/chat';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.chat.title),
  description: pageCopy.dashboard.chat.description
};

export default async function Page() {
  await requirePageAccess(permissions.chat.view);
  return <ChatViewPage />;
}
