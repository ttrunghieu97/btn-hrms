import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { CandidatesView } from '@/features/recruitment';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.candidates),
};

export default async function RecruitmentCandidatesPage() {
  await requirePageAccess('recruitment:view');
  return <CandidatesView />;
}
