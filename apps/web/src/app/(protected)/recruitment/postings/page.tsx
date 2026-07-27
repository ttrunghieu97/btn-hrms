import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { PostingsView } from '@/features/recruitment';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.postings),
};

export default async function RecruitmentPostingsPage() {
  await requireServerSession();
  return <PostingsView />;
}
