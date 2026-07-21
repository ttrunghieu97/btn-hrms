import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { OnboardingPageClient } from '@/features/onboarding';

export const metadata = { title: buildDashboardMetadataTitle(routeLabels.onboardingTemplates) };

export default async function OnboardingPage() {
  await requirePageAccess('onboarding:view');
  return <OnboardingPageClient />;
}
