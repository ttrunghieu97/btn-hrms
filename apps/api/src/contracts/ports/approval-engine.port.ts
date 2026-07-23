/**
 * Port for the approval engine — used by integration modules that
 * bridge domain events with approval workflows (leave, recruitment,
 * payroll, asset-approval).
 *
 * Integration modules MUST NOT import PlatformApprovalEngineService
 * or PlatformApprovalEngineRepository directly.
 */
export const APPROVAL_ENGINE_PORT = "APPROVAL_ENGINE_PORT";

export interface RequestApprovalInput {
  policyId: string;
  subjectType: string;
  subjectId: string;
  requestedByUserId: string | null;
  metadata?: Record<string, unknown>;
}

export interface ApprovalRequestResult {
  id: string;
  status?: string;
  [key: string]: unknown;
}

export interface DecideStepInput {
  requestId: string;
  stepIndex: number;
  decision: "approve" | "reject";
  decidedByUserId: string;
  comment?: string | null;
}

export interface PendingStep {
  id: string;
  stepIndex: number;
  requestId: string;
  status: string;
  approverUserId: string | null;
}

export interface ApprovalEnginePort {
  requestApproval(input: RequestApprovalInput): Promise<ApprovalRequestResult>;
  cancelApproval(approvalRequestId: string): Promise<void>;
  decideStep(input: DecideStepInput): Promise<{ status: string }>;
  findPendingStepByApprover(requestId: string, userId: string): Promise<PendingStep | null>;
  findActivePolicyByKey(key: string): Promise<{ id: string } | null>;
}
