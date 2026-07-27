import { ActivityFeed } from '@/features/monitoring';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { monitoringCopy } from '@/locales/vi';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: monitoringCopy.pages.activities.title,
  description: monitoringCopy.pages.activities.description,
};

export default async function ActivitiesPage() {
  await requireServerSession();
  return <ActivityFeed />;
}
