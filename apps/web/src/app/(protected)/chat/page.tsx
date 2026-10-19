import { DomainHeader } from '@/components/layout/domain-header';
import { ChatViewPage } from '@/features/chat';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.chat.title),
  description: pageCopy.dashboard.chat.description
};

export default async function Page() {
  await requireServerSession();
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader title={pageCopy.dashboard.chat.title} />
      <ChatViewPage />
    </div>
  );
}
