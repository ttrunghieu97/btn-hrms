import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { BenefitEnrollmentsView } from '@/features/benefits';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.benefitEnrollments),
};

export default async function BenefitEnrollmentsPage() {
  await requirePageAccess('benefits:view');
  return <BenefitEnrollmentsView />;
}
