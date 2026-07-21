import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { BenefitPlansView } from '@/features/benefits';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.benefitPlans),
};

export default async function BenefitPlansPage() {
  await requirePageAccess('benefits:view');
  return <BenefitPlansView />;
}
