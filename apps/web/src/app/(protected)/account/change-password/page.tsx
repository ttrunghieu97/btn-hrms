import { ChangePasswordPage } from '@/features/change-password';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.changePassword.title)
};

export default async function Page() {
  await requireServerSession();

  return <ChangePasswordPage />;
}
