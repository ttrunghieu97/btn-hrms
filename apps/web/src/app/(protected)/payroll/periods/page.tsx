import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
;
;
import { PayrollPeriodsPageClient } from '@/features/payroll';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.payrollPeriods),
};
export default function PayrollPeriodsPage() {
  return <PayrollPeriodsPageClient />;
}
