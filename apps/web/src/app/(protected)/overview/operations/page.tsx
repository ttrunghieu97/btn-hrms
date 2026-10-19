import { WidgetDashboard } from '@/features/dashboard';
import { requireServerSession } from '@/lib/server/auth-session';

export default async function OperationsOverviewPage() {
  await requireServerSession();
  return <WidgetDashboard layoutId="operations" />;
}
