import type { WorkflowTimelineItem, WorkflowStatus } from './types';

/**
 * Generic mapper from backend approval step/decision responses to
 * WorkflowTimelineItem[]. Use this in feature API adapters to normalize
 * approval history before passing to <WorkflowTimeline />.
 *
 * Each backend domain may have a different response shape —
 * pass a transform function to adapt:
 *
 * ```ts
 * const items = mapApprovalHistory(apiResponse, (step) => ({
 *   action: step.decision === 'approve' ? 'Approved' : 'Rejected',
 *   status: step.status,
 *   timestamp: step.decidedAt,
 *   actor: { id: step.approverId, name: step.approverName },
 * }));
 * ```
 */

export type ApprovalStepInput = {
  id: string;
  status: string;
  decidedAt?: string | null;
  createdAt?: string;
  comment?: string | null;
  approverUserId?: string | null;
  approverName?: string | null;
  stepIndex?: number;
};

function normalizeStatus(raw: string): WorkflowStatus {
  const s = raw.toLowerCase();
  if (s === 'approved' || s === 'approve') return 'approved';
  if (s === 'rejected' || s === 'reject') return 'rejected';
  if (s === 'cancelled' || s === 'cancel') return 'cancelled';
  if (s === 'skipped' || s === 'skip') return 'skipped';
  if (s === 'draft') return 'draft';
  return 'pending';
}

export function mapApprovalStepToTimelineItem(
  step: ApprovalStepInput,
): WorkflowTimelineItem {
  const status = normalizeStatus(step.status);

  const actionMap: Record<string, string> = {
    pending: 'Awaiting review',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
    draft: 'Submitted',
  };

  return {
    id: step.id,
    action: actionMap[status] ?? step.status,
    status,
    timestamp: step.decidedAt ?? step.createdAt ?? new Date().toISOString(),
    actor: step.approverUserId
      ? { id: step.approverUserId, name: step.approverName ?? 'Unknown' }
      : undefined,
    comment: step.comment ?? undefined,
    metadata: step.stepIndex !== undefined
      ? { stepIndex: step.stepIndex }
      : undefined,
  };
}

export function mapApprovalHistory(
  steps: ApprovalStepInput[],
): WorkflowTimelineItem[] {
  return steps.map(mapApprovalStepToTimelineItem);
}
