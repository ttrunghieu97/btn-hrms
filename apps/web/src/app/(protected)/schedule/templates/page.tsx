import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { redirect } from 'next/navigation';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.templates),
};

export default function ScheduleTemplatesPage() {
  redirect('/schedule');
}
