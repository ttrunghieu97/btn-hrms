import { ActivityFeed } from '@/features/monitoring';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { monitoringCopy } from '@/locales/vi';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: monitoringCopy.pages.activities.title,
  description: monitoringCopy.pages.activities.description,
};

export default async function ActivitiesPage() {
  await requirePageAccess(permissions.monitoring.view);
  return <ActivityFeed />;
}
