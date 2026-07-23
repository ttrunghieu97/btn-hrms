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
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import { consumerIdempotency } from "@/infrastructure/database/schema/_shared/consumer-idempotency";

const CONSUMER_ID = "asset-approval-integration";

@Injectable()
export class AssetApprovalIntegrationHandler implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly policyResolver: AssetApprovalPolicyResolver,
    private readonly gateway: AssetApprovalGateway,
    private readonly linkRepo: AssetApprovalLinkRepository,
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly requestContext: RequestContextService,
  ) {
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
    const idempotentId = `${CONSUMER_ID}:${eventId}`;
    if (await this.isProcessed(idempotentId)) return;

    try {
      const existingLink = await this.linkRepo.findBySubject(
        subjectType,
        subjectId,
      );
      if (existingLink) {
        this.logger.log(
          `Correlation already exists for ${subjectType} ${subjectId} — skipping`,
        );
        await this.markProcessed(idempotentId);
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

      await this.markProcessed(idempotentId);
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

  private isProcessed(idempotentId: string): Promise<boolean> {
    return this.db.query.consumerIdempotency
      .findFirst({
        where: (t: any, { eq: eqFn }: any) => eqFn(t.eventId, idempotentId),
      })
      .then(Boolean);
  }

  private async markProcessed(idempotentId: string): Promise<void> {
    await this.db.insert(consumerIdempotency).values({
      consumerId: CONSUMER_ID,
      eventId: idempotentId,
    });
  }
}
