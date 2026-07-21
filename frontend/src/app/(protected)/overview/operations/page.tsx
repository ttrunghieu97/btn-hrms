import { WidgetDashboard } from '@/features/dashboard';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';

export default async function OperationsOverviewPage() {
  await requirePageAccess(permissions.dashboard.view);
  return <WidgetDashboard layoutId="operations" />;
}
