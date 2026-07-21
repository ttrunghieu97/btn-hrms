import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { OffboardingPageClient } from '@/features/offboarding';

export const metadata = {
  title: buildDashboardMetadataTitle('Offboarding'),
};

export default async function OffboardingPage() {
  await requirePageAccess('offboarding:view');
  return <OffboardingPageClient />;
}
