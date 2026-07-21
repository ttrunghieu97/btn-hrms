import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
;
;
import { PayrollRunDetailPageClient } from '@/features/payroll';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.payrollRuns),
};
interface Props {
  params: Promise<{ runId: string }>;
}
export default async function PayrollRunDetailPage({ params }: Props) {
  const { runId } = await params;
  return <PayrollRunDetailPageClient runId={runId} />;
}
