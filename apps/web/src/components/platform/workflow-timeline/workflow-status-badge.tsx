import { Badge } from '@/components/ui/badge';
import type { WorkflowStatus } from './types';

const statusConfig: Record<WorkflowStatus, { label: string; variant: 'neutral' | 'warning' | 'success' | 'destructive' }> = {
  draft: { label: 'Bản nháp', variant: 'neutral' },
  pending: { label: 'Chờ duyệt', variant: 'warning' },
  approved: { label: 'Đã duyệt', variant: 'success' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  cancelled: { label: 'Đã hủy', variant: 'neutral' },
  skipped: { label: 'Bỏ qua', variant: 'neutral' },
};

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
}

export function WorkflowStatusBadge({ status }: WorkflowStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

export function getWorkflowStatusVariant(status: WorkflowStatus): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': case 'draft': return 'warning';
    case 'rejected': return 'error';
    case 'cancelled': case 'skipped': return 'neutral';
  }
}

export function getActivityTimelineStatus(
  status: WorkflowStatus,
): 'completed' | 'pending' | 'rejected' | 'cancelled' | 'skipped' {
  switch (status) {
    case 'approved': return 'completed';
    case 'pending': case 'draft': return 'pending';
    case 'rejected': return 'rejected';
    case 'cancelled': return 'cancelled';
    case 'skipped': return 'skipped';
  }
}
