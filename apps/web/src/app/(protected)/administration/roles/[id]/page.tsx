import { PermissionWorkspace } from '@/features/roles';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import type { Metadata } from 'next';

interface RoleWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.roleManagement.title),
  description: pageCopy.dashboard.roleManagement.description,
};

export default async function AdminRoleWorkspacePage({ params }: RoleWorkspacePageProps) {
  await requireServerSession();
  const { id } = await params;

  return <PermissionWorkspace id={id} variant="full" />;
}
