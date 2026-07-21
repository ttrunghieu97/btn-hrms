import { ChangePasswordPage } from '@/features/change-password';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.changePassword.title)
};

export default async function Page() {
  await requirePageAccess(permissions.auth.changePassword);

  return <ChangePasswordPage />;
}
