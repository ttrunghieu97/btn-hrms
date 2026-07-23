'use client';

import { useMemo } from 'react';
import { WorkflowTimeline, mapApprovalHistory } from '@/components/platform';
import type { ApprovalStepInput } from '@/components/platform';

interface ApprovalTimelineProps {
  /** Steps from the approval request detail endpoint */
  steps?: ApprovalStepInput[];
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * Approval timeline — renders approval step history using the
 * platform WorkflowTimeline component.
 *
 * Usage:
 * ```tsx
 * <ApprovalTimeline steps={approvalRequest.steps} isLoading={isLoading} />
 * ```
 */
export function ApprovalTimeline({ steps, isLoading, error }: ApprovalTimelineProps) {
  const items = useMemo(() => {
    if (!steps) return [];
    return mapApprovalHistory(steps);
  }, [steps]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Approval Timeline</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        Failed to load approval history: {error.message}
      </div>
    );
  }

  if (!steps || steps.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Approval Timeline</h3>
        <p className="text-sm text-muted-foreground">No approval steps recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Approval Timeline</h3>
      <WorkflowTimeline items={items} />
    </div>
  );
}
