import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { ApprovalRequestCompletedEvent } from "@/core/events/events/approval-request-completed.event";
import { AssetDecisionHandler } from "./asset-decision.handler.service";
import { AssetApprovalLinkRepository } from "./asset-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";
import { TracingService } from "@/shared/context/tracing.service";
import { EventIdempotencyRepository } from "@/infrastructure/repositories/event-idempotency.repository";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import { ASSET_SUBJECT_TYPES } from "./asset-approval.gateway";

const CONSUMER_ID = "asset-approval-listener";

// Engine subjectType string → our internal subject discriminator.
const SUBJECT_FROM_ENGINE: Record<string, "request"> = {
  [ASSET_SUBJECT_TYPES.request]: "request",
};

@Injectable()
export class AssetApprovalListener implements OnModuleInit {
  private readonly logger: ContextLogger;
  private readonly idempotency: EventIdempotencyRepository;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly decisionHandler: AssetDecisionHandler,
    private readonly linkRepo: AssetApprovalLinkRepository,
    idempotencyOrDb: EventIdempotencyRepository,
    private readonly requestContext: RequestContextService,
    private readonly tracing: TracingService,
  ) {
    this.idempotency =
      typeof (idempotencyOrDb as EventIdempotencyRepository)?.isProcessed === "function"
        ? idempotencyOrDb
        : new EventIdempotencyRepository(idempotencyOrDb as unknown as AppDatabase);
    this.logger = new ContextLogger(
      this.requestContext,
      AssetApprovalListener.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      ApprovalRequestCompletedEvent.eventType,
      this.handleEngineDecision.bind(this),
    );
  }

  private async handleEngineDecision(
    event: ApprovalRequestCompletedEvent,
  ): Promise<void> {
    const subjectType = SUBJECT_FROM_ENGINE[event.data.subjectType];
    if (!subjectType) return;

    const trace = this.tracing.extractFromPayload(event.data);
    const rootCtx = this.requestContext.get();

    return this.requestContext.run(
      {
        ...rootCtx,
        requestId: rootCtx?.requestId ?? trace?.traceId ?? event.eventId,
        traceId: trace?.traceId ?? rootCtx?.traceId,
        correlationId: trace?.correlationId ?? rootCtx?.correlationId,
      } as any,
      async () => {
        await this.tracing.runWithSpan(
          "asset.integration.consume_engine_decision",
          async () => {
            await this.handleEngineDecisionInner(event, subjectType);
          },
        );
      },
    );
  }

  private async handleEngineDecisionInner(
    event: ApprovalRequestCompletedEvent,
    subjectType: "request",
  ): Promise<void> {
    const { approvalRequestId, subjectId, outcome, completedAt } = event.data;
    const idempotentEventId = event.eventId || approvalRequestId;
    if (await this.idempotency.isProcessed(CONSUMER_ID, idempotentEventId)) return;

    try {
      const link = await this.linkRepo.findByApprovalRequestId(
        approvalRequestId,
      );
      if (!link) {
        this.logger.warn(
          `No asset link for approval ${approvalRequestId} — ignoring`,
        );
        return;
      }

      const decision: "approved" | "rejected" | "cancelled" =
        outcome === "approved"
          ? "approved"
          : outcome === "cancelled"
            ? "cancelled"
            : "rejected";

      await this.decisionHandler.handleDecision({
        subjectType,
        subjectId,
        decision,
        decidedAt: new Date(completedAt),
      });

      await this.linkRepo.updateStatus(approvalRequestId, decision);
      await this.idempotency.markProcessed(CONSUMER_ID, idempotentEventId);
      this.logger.log(`Engine ${decision} applied to ${subjectType} ${subjectId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed processing engine decision eventId=${event.eventId}: ${msg}`,
      );
      throw error;
    }
  }
}
