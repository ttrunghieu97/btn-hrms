import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
;
;
import { PayslipDetailPageClient } from '@/features/payroll';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.payslips),
};
interface Props {
  params: Promise<{ payslipId: string }>;
}
export default async function PayslipDetailPage({ params }: Props) {
  const { payslipId } = await params;
  return <PayslipDetailPageClient payslipId={payslipId} />;
}
