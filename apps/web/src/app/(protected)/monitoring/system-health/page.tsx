import { SystemHealthCard } from '@/features/monitoring';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { monitoringCopy } from '@/locales/vi';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: monitoringCopy.pages.systemHealth.title,
  description: monitoringCopy.pages.systemHealth.description,
};

export default async function SystemHealthPage() {
  await requireServerSession();
  return <SystemHealthCard />;
}
