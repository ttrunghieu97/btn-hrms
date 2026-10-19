import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { AssetRequestApprovalRequestedEvent } from "@/core/events/events/asset-request-approval-requested.event";
import { AssetApprovalPolicyResolver } from "./asset-approval-policy.resolver";
import { AssetApprovalGateway } from "./asset-approval.gateway";
import {
  AssetApprovalLinkRepository,
  type AssetApprovalSubject,
} from "./asset-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";
import { EventIdempotencyRepository } from "@/infrastructure/repositories/event-idempotency.repository";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";

const CONSUMER_ID = "asset-approval-integration";

@Injectable()
export class AssetApprovalIntegrationHandler implements OnModuleInit {
  private readonly logger: ContextLogger;
  private readonly idempotency: EventIdempotencyRepository;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly policyResolver: AssetApprovalPolicyResolver,
    private readonly gateway: AssetApprovalGateway,
    private readonly linkRepo: AssetApprovalLinkRepository,
    idempotencyOrDb: EventIdempotencyRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.idempotency =
      typeof (idempotencyOrDb as EventIdempotencyRepository)?.isProcessed === "function"
        ? idempotencyOrDb
        : new EventIdempotencyRepository(idempotencyOrDb as unknown as AppDatabase);
    this.logger = new ContextLogger(
      this.requestContext,
      AssetApprovalIntegrationHandler.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      AssetRequestApprovalRequestedEvent.eventType,
      this.handleRequestApprovalRequested.bind(this),
    );
  }

  private async handleRequestApprovalRequested(
    event: AssetRequestApprovalRequestedEvent,
  ): Promise<void> {
    await this.requestApprovalFor(
      "request",
      event.eventId,
      event.data.requestId,
      event.data.requestedByUserId,
      {
        requesterEmployeeId: event.data.requesterEmployeeId,
        requestedAt: event.data.requestedAt,
      },
    );
  }

  private async requestApprovalFor(
    subjectType: AssetApprovalSubject,
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
