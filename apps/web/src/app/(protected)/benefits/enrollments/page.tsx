import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { BenefitEnrollmentsView } from '@/features/benefits';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.benefitEnrollments),
};

export default async function BenefitEnrollmentsPage() {
  await requireServerSession();
  return <BenefitEnrollmentsView />;
}
