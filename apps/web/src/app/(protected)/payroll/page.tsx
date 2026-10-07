import { routeLabels, buildDashboardMetadataTitle } from '@/lib/app-copy';
import { PayrollDashboardPageClient } from '@/features/payroll';
import { requireServerSession } from '@/lib/server/auth-session';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.payroll),
};

export default async function PayrollOverviewPage() {
  await requireServerSession();
  return <PayrollDashboardPageClient />;
}
