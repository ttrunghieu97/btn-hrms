import { Injectable } from "@nestjs/common";
import { AssetRequestRepository } from "@/modules/asset-management/request/repositories/asset-request.repository";
import { type AssetApprovalSubject } from "./asset-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";

const REQUEST_TERMINAL = ["approved", "rejected", "cancelled", "fulfilled"];

@Injectable()
export class AssetDecisionHandler {
  private readonly logger: ContextLogger;

  constructor(
    private readonly requestRepo: AssetRequestRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      AssetDecisionHandler.name,
    );
  }

  async handleDecision(params: {
    subjectType: AssetApprovalSubject;
    subjectId: string;
    decision: "approved" | "rejected";
    decidedAt: Date;
  }): Promise<void> {
    await this.applyRequestDecision(params.subjectId, params.decision);
  }

  private async applyRequestDecision(
    requestId: string,
    decision: "approved" | "rejected",
  ): Promise<void> {
    const existing = await this.requestRepo.findById(requestId);
    if (!existing) {
      this.logger.warn(`Asset request ${requestId} not found for decision`);
      return;
    }
    if (REQUEST_TERMINAL.includes(existing.status)) {
      this.logger.warn(
        `Asset request ${requestId} already ${existing.status} — ignoring late ${decision}`,
      );
      return;
    }
    const actorUserId = this.requestContext.get()?.userId ?? null;
    await this.requestRepo.updateStatus(requestId, {
      status: decision,
      updatedBy: actorUserId,
    });
    this.logger.log(`Asset request ${requestId} → ${decision}`);
  }
}
