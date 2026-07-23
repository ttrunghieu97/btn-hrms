'use client';

import { useMemo } from 'react';
import { WorkflowTimeline, mapApprovalHistory } from '@/components/platform';
import type { ApprovalStepInput } from '@/components/platform';

interface LeaveDetailTimelineProps {
  steps?: ApprovalStepInput[];
  isLoading?: boolean;
}

/**
 * Leave approval timeline.
 * Reuses the platform WorkflowTimeline component.
 */
export function LeaveDetailTimeline({ steps, isLoading }: LeaveDetailTimelineProps) {
  const items = useMemo(() => {
    if (!steps) return [];
    return mapApprovalHistory(steps);
  }, [steps]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Approval Timeline</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
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
