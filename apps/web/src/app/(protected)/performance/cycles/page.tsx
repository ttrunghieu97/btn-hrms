import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { PerformanceCyclesView } from '@/features/performance';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.performanceCycles),
};

export default async function PerformanceCyclesPage() {
  await requireServerSession();
  return <PerformanceCyclesView />;
}
