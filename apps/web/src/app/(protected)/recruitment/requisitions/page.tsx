import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { RequisitionsView } from '@/features/recruitment';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.requisitions),
};

export default async function RecruitmentRequisitionsPage() {
  await requireServerSession();
  return <RequisitionsView />;
}
