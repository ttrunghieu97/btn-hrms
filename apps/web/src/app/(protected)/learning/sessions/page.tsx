import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { SessionsView } from '@/features/learning';

export const metadata = { title: buildDashboardMetadataTitle(routeLabels.learningSessions) };

export default async function SessionsPage() {
  await requireServerSession();
  return <SessionsView />;
}
