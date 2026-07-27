import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { OffboardingPageClient } from '@/features/offboarding';

export const metadata = {
  title: buildDashboardMetadataTitle('Offboarding'),
};

export default async function OffboardingPage() {
  await requireServerSession();
  return <OffboardingPageClient />;
}
