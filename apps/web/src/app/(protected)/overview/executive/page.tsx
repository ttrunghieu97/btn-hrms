import { WidgetDashboard } from '@/features/dashboard';
import { requireServerSession } from '@/lib/server/auth-session';

export default async function ExecutiveOverviewPage() {
  await requireServerSession();
  return <WidgetDashboard layoutId="executive" />;
}
