import { WidgetDashboard } from '@/features/dashboard';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';

export default async function OperationsOverviewPage() {
  await requireServerSession();
  return <WidgetDashboard layoutId="operations" />;
}
