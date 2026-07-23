'use client';

import { ActivityTimeline } from '@/components/platform/activity-timeline';
import type { WorkflowTimelineItem, WorkflowStatus } from './types';
import { getActivityTimelineStatus } from './workflow-status-badge';

export type { WorkflowTimelineItem, WorkflowStatus, WorkflowActor } from './types';

export interface WorkflowTimelineProps {
  items: WorkflowTimelineItem[];
  className?: string;
  emptyMessage?: string;
}

/**
 * Domain-neutral workflow timeline.
 *
 * Renders approval/workflow history for any domain (leave, expense,
 * recruitment, payroll, asset) using the platform ActivityTimeline primitive.
 *
 * ```tsx
 * // Leave approval history
 * <WorkflowTimeline items={leaveApprovalSteps} />
 *
 * // Expense workflow
 * <WorkflowTimeline items={expenseWorkflow} />
 * ```
 */
export function WorkflowTimeline({
  items,
  className,
  emptyMessage,
}: WorkflowTimelineProps) {
  const timelineItems = items.map((item) => ({
    id: item.id,
    type: 'approval' as const,
    title: item.action,
    description: item.comment,
    status: getActivityTimelineStatus(item.status),
    timestamp: item.timestamp,
    actor: item.actor
      ? {
          id: item.actor.id,
          name: item.actor.name,
          avatar: item.actor.avatar,
        }
      : undefined,
    metadata: item.metadata
      ? Object.entries(item.metadata).map(([key, value]) => ({
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
          value: String(value ?? ''),
        }))
      : undefined,
  }));

  return (
    <div className={className}>
      <ActivityTimeline items={timelineItems} emptyMessage={emptyMessage} />
    </div>
  );
}
