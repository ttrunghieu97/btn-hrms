import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { CertificationsView } from '@/features/learning';

export const metadata = { title: buildDashboardMetadataTitle(routeLabels.learningCertifications) };

export default async function CertificationsPage() {
  await requirePageAccess('learning:view');
  return <CertificationsView />;
}
