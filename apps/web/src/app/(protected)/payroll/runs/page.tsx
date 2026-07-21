import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
;
;
import { PayrollRunsPageClient } from '@/features/payroll';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.payrollRuns),
};
export default function PayrollRunsPage() {
  return <PayrollRunsPageClient />;
}
