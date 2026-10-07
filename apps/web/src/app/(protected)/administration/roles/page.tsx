import { RolesListingPage } from '@/features/roles/server';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.roleManagement.title),
  description: pageCopy.dashboard.roleManagement.description
};

export default async function AdminRolesPage() {
  await requireServerSession();

  return <RolesListingPage />;
}
