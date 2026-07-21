import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { PerformanceGoalsView } from '@/features/performance';

export const metadata = {
  title: buildDashboardMetadataTitle('Mục tiêu đánh giá'),
};

export default async function PerformanceGoalsPage() {
  await requirePageAccess('performance:view');
  return <PerformanceGoalsView />;
}
