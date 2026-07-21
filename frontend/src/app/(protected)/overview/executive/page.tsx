import { WidgetDashboard } from '@/features/dashboard';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';

export default async function ExecutiveOverviewPage() {
  await requirePageAccess(permissions.dashboard.view);
  return <WidgetDashboard layoutId="executive" />;
}
