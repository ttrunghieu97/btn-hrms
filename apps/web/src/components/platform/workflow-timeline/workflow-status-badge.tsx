'use client';

import type { WorkflowStatus } from './types';

const statusConfig: Record<WorkflowStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  skipped: { label: 'Skipped', className: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500' },
};

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
}

export function WorkflowStatusBadge({ status }: WorkflowStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
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
