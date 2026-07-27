import { DepartmentsPositionsView } from '@/features/departments';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.positions),
};

export default async function OrganizationPositionsPage() {
  await requireServerSession();
  return <DepartmentsPositionsView />;
}
