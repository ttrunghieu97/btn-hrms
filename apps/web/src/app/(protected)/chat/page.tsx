import { ChatViewPage } from '@/features/chat';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.chat.title),
  description: pageCopy.dashboard.chat.description
};

export default async function Page() {
  await requireServerSession();
  return <ChatViewPage />;
}
