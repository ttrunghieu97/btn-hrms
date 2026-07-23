import { routeLabels, buildDashboardMetadataTitle } from '@/lib/app-copy';
import { PayrollDashboardPageClient } from '@/features/payroll';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.payroll),
};

export default function PayrollOverviewPage() {
  return <PayrollDashboardPageClient />;
}
