import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { CandidatesView } from '@/features/recruitment';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.candidates),
};

export default async function RecruitmentCandidatesPage() {
  await requireServerSession();
  return <CandidatesView />;
}
