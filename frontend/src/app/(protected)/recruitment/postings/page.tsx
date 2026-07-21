import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { PostingsView } from '@/features/recruitment';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.postings),
};

export default async function RecruitmentPostingsPage() {
  await requirePageAccess('recruitment:view');
  return <PostingsView />;
}
