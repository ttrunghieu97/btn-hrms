import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { PerformanceReviewsView } from '@/features/performance';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.performanceReviews),
};

export default async function PerformanceReviewsPage() {
  await requirePageAccess('performance:view');
  return <PerformanceReviewsView />;
}
