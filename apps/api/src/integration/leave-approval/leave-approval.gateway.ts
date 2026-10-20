import { Injectable, Optional } from "@nestjs/common";
import { PlatformApprovalEngineService } from "@/modules/platform-approval-engine/platform-approval-engine.service";
import { LeaveApprovalLinkRepository } from "./leave-approval-link.repository";
import { EventOutboxDispatcherService } from "@/core/events/event-outbox-dispatcher.service";

interface ApprovalRequestResult {
  id: string;
}

@Injectable()
export class LeaveApprovalGateway {
  constructor(
    private readonly engine: PlatformApprovalEngineService,
    @Optional() private readonly linkRepo?: LeaveApprovalLinkRepository,
    @Optional() private readonly outboxDispatcher?: EventOutboxDispatcherService,
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
    const result = await this.engine.decideStep(input);
    if (this.outboxDispatcher) {
      try {
        await this.outboxDispatcher.dispatchOnce();
      } catch {
        // Non-fatal: periodic outbox dispatcher will retry
      }
    }
    return result;
  }

  async findPendingStepByApprover(requestId: string, userId: string) {
    const direct = await this.engine.findPendingStepByApprover(requestId, userId);
    if (direct) return direct;
    if (this.linkRepo) {
      const link = await this.linkRepo.findByLeaveRequestId(requestId);
      if (link) {
        return this.engine.findPendingStepByApprover(link.approvalRequestId, userId);
      }
    }
    return null;
  }
}
