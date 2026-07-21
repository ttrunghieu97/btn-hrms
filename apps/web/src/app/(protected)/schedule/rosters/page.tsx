import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { redirect } from 'next/navigation';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.rosters),
};

export default function ScheduleRostersPage() {
  redirect('/schedule');
}
