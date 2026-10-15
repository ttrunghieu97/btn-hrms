import { DepartmentsPositionsView } from '@/features/departments';
import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle } from '@/lib/app-copy';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: buildDashboardMetadataTitle('Địa điểm làm việc')
};

export default async function OrganizationLocationsPage() {
  await requireServerSession();
  return <DepartmentsPositionsView />;
}
