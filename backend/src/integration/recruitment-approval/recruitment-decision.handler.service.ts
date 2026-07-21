import { Injectable } from "@nestjs/common";
import { RequisitionsRepository } from "@/modules/recruitment/requisitions/repositories/requisitions.repository";
import { OffersRepository } from "@/modules/recruitment/offers/repositories/offers.repository";
import {
  RecruitmentApprovalLinkRepository,
  type RecruitmentApprovalSubject,
} from "./recruitment-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";

const REQUISITION_TERMINAL = ["approved", "rejected", "closed"];
const OFFER_TERMINAL = ["approved", "rejected", "accepted", "declined"];

@Injectable()
export class RecruitmentDecisionHandler {
  private readonly logger: ContextLogger;

  constructor(
    private readonly requisitionsRepo: RequisitionsRepository,
    private readonly offersRepo: OffersRepository,
    private readonly linkRepo: RecruitmentApprovalLinkRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      RecruitmentDecisionHandler.name,
    );
  }

  async handleDecision(params: {
    subjectType: RecruitmentApprovalSubject;
    subjectId: string;
    decision: "approved" | "rejected";
    decidedAt: Date;
  }): Promise<void> {
    if (params.subjectType === "requisition") {
      await this.applyRequisitionDecision(params.subjectId, params.decision);
    } else {
      await this.applyOfferDecision(
        params.subjectId,
        params.decision,
        params.decidedAt,
      );
    }
  }

  private async applyRequisitionDecision(
    requisitionId: string,
    decision: "approved" | "rejected",
  ): Promise<void> {
    const existing = await this.requisitionsRepo.findById(requisitionId);
    if (!existing) {
      this.logger.warn(`Requisition ${requisitionId} not found for decision`);
      return;
    }
    if (REQUISITION_TERMINAL.includes(existing.status)) {
      this.logger.warn(
        `Requisition ${requisitionId} already ${existing.status} — ignoring late ${decision}`,
      );
      return;
    }
    await this.requisitionsRepo.updateStatus(requisitionId, decision);
    this.logger.log(`Requisition ${requisitionId} → ${decision}`);
  }

  private async applyOfferDecision(
    offerId: string,
    decision: "approved" | "rejected",
    decidedAt: Date,
  ): Promise<void> {
    const existing = await this.offersRepo.findById(offerId);
    if (!existing) {
      this.logger.warn(`Offer ${offerId} not found for decision`);
      return;
    }
    if (OFFER_TERMINAL.includes(existing.status)) {
      this.logger.warn(
        `Offer ${offerId} already ${existing.status} — ignoring late ${decision}`,
      );
      return;
    }
    await this.offersRepo.updateStatus(
      offerId,
      decision,
      undefined,
      decidedAt,
    );
    this.logger.log(`Offer ${offerId} → ${decision}`);
  }
}
