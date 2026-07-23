import type { ActivityProvider, ActivityItem } from '../types';

/**
 * Approval activity provider — maps approval history to ActivityItems.
 * Phase 1: mock. Phase 2: fetch from approval API.
 */
const mockApprovalActivities: ActivityItem[] = [
  { id: 'aa-1', type: 'approval', title: 'Leave request approved', description: 'Nguyen Van A — Annual leave (3 days)', timestamp: new Date(Date.now() - 3600000).toISOString(), severity: 'info', actor: { id: 'u-1', name: 'Tran B (Manager)' } },
  { id: 'aa-2', type: 'approval', title: 'Expense claim rejected', description: 'Le C — Travel expenses ($250)', timestamp: new Date(Date.now() - 7200000).toISOString(), severity: 'warning', actor: { id: 'u-2', name: 'Pham D (Finance)' } },
  { id: 'aa-3', type: 'approval', title: 'Contract extended', description: 'Tran Thi B — Permanent contract', timestamp: new Date(Date.now() - 86400000).toISOString(), severity: 'info', actor: { id: 'u-3', name: 'HR System' } },
];

export const approvalActivityProvider: ActivityProvider = {
  id: 'approvals',
  label: 'Approvals',
  getActivities: async () => mockApprovalActivities,
};
