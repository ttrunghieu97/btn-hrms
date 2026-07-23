import { SystemHealthCard } from '@/features/monitoring';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { monitoringCopy } from '@/locales/vi';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: monitoringCopy.pages.systemHealth.title,
  description: monitoringCopy.pages.systemHealth.description,
};

export default async function SystemHealthPage() {
  await requirePageAccess(permissions.monitoring.view);
  return <SystemHealthCard />;
}
