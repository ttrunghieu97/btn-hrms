import { redirect } from 'next/navigation';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.recruitment),
};

export default function RecruitmentPage() {
  redirect('/recruitment/requisitions');
}
