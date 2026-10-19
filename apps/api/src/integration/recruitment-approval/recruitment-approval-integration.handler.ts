import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { RequisitionApprovalRequestedEvent } from "@/core/events/events/requisition-approval-requested.event";
import { OfferApprovalRequestedEvent } from "@/core/events/events/offer-approval-requested.event";
import { RecruitmentApprovalPolicyResolver } from "./recruitment-approval-policy.resolver";
import { RecruitmentApprovalGateway } from "./recruitment-approval.gateway";
import {
  RecruitmentApprovalLinkRepository,
  type RecruitmentApprovalSubject,
} from "./recruitment-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";
import { EventIdempotencyRepository } from "@/infrastructure/repositories/event-idempotency.repository";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";

const CONSUMER_ID = "recruitment-approval-integration";

@Injectable()
export class RecruitmentApprovalIntegrationHandler implements OnModuleInit {
  private readonly logger: ContextLogger;
  private readonly idempotency: EventIdempotencyRepository;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly policyResolver: RecruitmentApprovalPolicyResolver,
    private readonly gateway: RecruitmentApprovalGateway,
    private readonly linkRepo: RecruitmentApprovalLinkRepository,
    idempotencyOrDb: EventIdempotencyRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.idempotency =
      typeof (idempotencyOrDb as EventIdempotencyRepository)?.isProcessed === "function"
        ? idempotencyOrDb
        : new EventIdempotencyRepository(idempotencyOrDb as unknown as AppDatabase);
    this.logger = new ContextLogger(
      this.requestContext,
      RecruitmentApprovalIntegrationHandler.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      RequisitionApprovalRequestedEvent.eventType,
      this.handleRequisitionApprovalRequested.bind(this),
    );
    this.eventBus.on(
      OfferApprovalRequestedEvent.eventType,
      this.handleOfferApprovalRequested.bind(this),
    );
  }

  private async handleRequisitionApprovalRequested(
    event: RequisitionApprovalRequestedEvent,
  ): Promise<void> {
    await this.requestApprovalFor(
      "requisition",
      event.eventId,
      event.data.requisitionId,
      event.data.requestedByUserId,
      { departmentId: event.data.departmentId },
    );
  }

  private async handleOfferApprovalRequested(
    event: OfferApprovalRequestedEvent,
  ): Promise<void> {
    await this.requestApprovalFor(
      "offer",
      event.eventId,
      event.data.offerId,
      event.data.requestedByUserId,
      { applicationId: event.data.applicationId },
    );
  }

  private async requestApprovalFor(
    subjectType: RecruitmentApprovalSubject,
    eventId: string,
    subjectId: string,
    requestedByUserId: string | null,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    if (await this.idempotency.isProcessed(CONSUMER_ID, eventId)) return;

    try {
      const existingLink = await this.linkRepo.findBySubject(
        subjectType,
        subjectId,
      );
      if (existingLink) {
        this.logger.log(
          `Correlation already exists for ${subjectType} ${subjectId} — skipping`,
        );
        await this.idempotency.markProcessed(CONSUMER_ID, eventId);
        return;
      }

      const policyId = await this.policyResolver.resolve(subjectType);
      if (!policyId) {
        this.logger.warn(
          `No approval policy for ${subjectType}. Subject ${subjectId} skipped.`,
        );
        return;
      }

      const approvalRequest = await this.gateway.requestApproval({
        subjectType,
        policyId,
        subjectId,
        requestedByUserId,
        metadata,
      });

      await this.linkRepo.create({
        subjectType,
        subjectId,
        approvalRequestId: approvalRequest.id,
        policyId,
      });

      await this.idempotency.markProcessed(CONSUMER_ID, eventId);
      this.logger.log(
        `Approval requested: ${subjectType} ${subjectId} → approval ${approvalRequest.id}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed processing ${subjectType} approval request eventId=${eventId}: ${msg}`,
      );
      throw error;
    }
  }
}
