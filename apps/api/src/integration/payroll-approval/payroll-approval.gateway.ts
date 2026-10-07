import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineService } from "@/modules/platform-approval-engine/platform-approval-engine.service";

export interface ApprovalRequestResult {
  id: string;
  status: string;
  [key: string]: unknown;
}

@Injectable()
export class PayrollApprovalGateway {
  constructor(
    private readonly engine: PlatformApprovalEngineService,
  ) {}

  async requestApproval(input: {
    policyId: string;
    payrollRunId: string;
    requestedByUserId: string | null;
  }): Promise<ApprovalRequestResult> {
    return this.engine.requestApproval({
      policyId: input.policyId,
      subjectType: "payroll",
      subjectId: input.payrollRunId,
      requestedByUserId: input.requestedByUserId,
      metadata: { source: "payroll", payrollRunId: input.payrollRunId },
    });
  }

  async cancelApproval(approvalRequestId: string): Promise<void> {
    return this.engine.cancelApproval(approvalRequestId);
  }

  async decideStep(input: {
    requestId: string;
    stepIndex: number;
    decision: "approve" | "reject";
    decidedByUserId: string;
    comment?: string | null;
  }) {
    return this.engine.decideStep(input);
  }

  async findPendingStepByApprover(requestId: string, userId: string) {
    return this.engine.findPendingStepByApprover(requestId, userId);
  }
}
