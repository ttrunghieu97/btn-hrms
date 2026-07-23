import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
;
;
import { PayslipsPageClient } from '@/features/payroll';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.payslips),
};
export default function PayslipsPage() {
  return <PayslipsPageClient />;
}
