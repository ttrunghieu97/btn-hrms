import { Injectable, Inject } from "@nestjs/common";
import { PlatformApprovalEngineService } from "@/modules/platform-approval-engine/platform-approval-engine.service";

interface ApprovalRequestResult {
  id: string;
}

@Injectable()
export class LeaveApprovalGateway {
  constructor(
    private readonly engine: PlatformApprovalEngineService,
  ) {}

  async requestApproval(input: {
    policyId: string;
    leaveRequestId: string;
    requestedByUserId: string | null;
  }): Promise<ApprovalRequestResult> {
    return this.engine.requestApproval({
      policyId: input.policyId,
      subjectType: "leave",
      subjectId: input.leaveRequestId,
      requestedByUserId: input.requestedByUserId,
      metadata: { source: "leave" },
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
