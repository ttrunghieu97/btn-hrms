import { DataIntegrityPanel } from '@/features/monitoring';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { monitoringCopy } from '@/locales/vi';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: monitoringCopy.pages.dataIntegrity.title,
  description: monitoringCopy.pages.dataIntegrity.description,
};

export default async function DataIntegrityPage() {
  await requirePageAccess(permissions.monitoring.view);
  return <DataIntegrityPanel />;
}
