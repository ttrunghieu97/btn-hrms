import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
;
;
import { SalaryStructuresPageClient } from '@/features/payroll';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.salaryStructures),
};
export default function SalaryStructuresPage() {
  return <SalaryStructuresPageClient />;
}
