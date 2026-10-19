import { DomainHeader } from '@/components/layout/domain-header';
import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { OffboardingPageClient } from '@/features/offboarding';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.offboarding),
};

export default async function OffboardingPage() {
  await requireServerSession();
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader title={routeLabels.offboarding} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        <OffboardingPageClient />
      </div>
    </div>
  );
}
