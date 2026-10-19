import { DomainHeader } from '@/components/layout/domain-header';
import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { OnboardingPageClient } from '@/features/onboarding';

export const metadata = { title: buildDashboardMetadataTitle(routeLabels.onboardingTemplates) };

export default async function OnboardingPage() {
  await requireServerSession();
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader title={routeLabels.onboardingTemplates} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        <OnboardingPageClient />
      </div>
    </div>
  );
}
