import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { LearningPathsView } from '@/features/learning';

export const metadata = { title: buildDashboardMetadataTitle(routeLabels.learningPaths) };

export default async function LearningPathsPage() {
  await requireServerSession();
  return <LearningPathsView />;
}
