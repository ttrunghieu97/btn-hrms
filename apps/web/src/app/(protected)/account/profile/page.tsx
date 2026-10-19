import { ProfileViewPage } from '@/features/profile';
import { buildDashboardMetadataTitle, pageCopy, routeLabels } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.profile),
  description: pageCopy.dashboard.profile.description
};

export default async function AccountProfilePage() {
  await requireServerSession();

  return <ProfileViewPage />;
}
