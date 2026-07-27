import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { BenefitPlansView } from '@/features/benefits';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.benefitPlans),
};

export default async function BenefitPlansPage() {
  await requireServerSession();
  return <BenefitPlansView />;
}
