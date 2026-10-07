import { DataIntegrityPanel } from '@/features/monitoring';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { monitoringCopy } from '@/locales/vi';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: monitoringCopy.pages.dataIntegrity.title,
  description: monitoringCopy.pages.dataIntegrity.description,
};

export default async function DataIntegrityPage() {
  await requireServerSession();
  return <DataIntegrityPanel />;
}
