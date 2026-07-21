import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { RequisitionsView } from '@/features/recruitment';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.requisitions),
};

export default async function RecruitmentRequisitionsPage() {
  await requirePageAccess('recruitment:view');
  return <RequisitionsView />;
}
