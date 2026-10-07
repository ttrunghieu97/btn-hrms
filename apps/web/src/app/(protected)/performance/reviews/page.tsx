import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { PerformanceReviewsView } from '@/features/performance';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.performanceReviews),
};

export default async function PerformanceReviewsPage() {
  await requireServerSession();
  return <PerformanceReviewsView />;
}
