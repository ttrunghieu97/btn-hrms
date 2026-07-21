import { ProfileViewPage } from '@/features/profile';
import { buildDashboardMetadataTitle, pageCopy, routeLabels } from '@/lib/app-copy';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.profile),
  description: pageCopy.dashboard.profile.description
};

export default async function AccountProfilePage() {
  await requirePageAccess(permissions.employees.viewSelf);

  return <ProfileViewPage />;
}
