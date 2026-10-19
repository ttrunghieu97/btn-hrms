import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import { LeavePoliciesView } from '@/features/leave';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.policies),
};

export default function LeavePoliciesPage() {
  return <LeavePoliciesView />;
}
