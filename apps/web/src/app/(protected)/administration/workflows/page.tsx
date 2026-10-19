import { WorkflowAdminView } from '@/features/workflow';
import { buildDashboardMetadataTitle } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';

export const metadata = {
  title: buildDashboardMetadataTitle('Quy trình động (Workflow Engine)'),
  description: 'Quản lý định nghĩa quy trình và điều phối phiên thực thi',
};

export default async function WorkflowAdminPage() {
  await requireServerSession();
  return <WorkflowAdminView />;
}
