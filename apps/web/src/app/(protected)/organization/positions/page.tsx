import { DepartmentsPositionsView } from '@/features/departments';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { buildDashboardMetadataTitle, routeLabels } from '@/lib/app-copy';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.positions),
};

export default async function OrganizationPositionsPage() {
  await requirePageAccess(permissions.departments.view);
  return <DepartmentsPositionsView />;
}
