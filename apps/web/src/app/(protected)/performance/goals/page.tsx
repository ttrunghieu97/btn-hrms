import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { PerformanceGoalsView } from '@/features/performance';

export const metadata = {
  title: buildDashboardMetadataTitle('Mục tiêu đánh giá'),
};

export default async function PerformanceGoalsPage() {
  await requireServerSession();
  return <PerformanceGoalsView />;
}
