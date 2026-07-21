import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { LearningPathsView } from '@/features/learning';

export const metadata = { title: buildDashboardMetadataTitle(routeLabels.learningPaths) };

export default async function LearningPathsPage() {
  await requirePageAccess('learning:view');
  return <LearningPathsView />;
}
