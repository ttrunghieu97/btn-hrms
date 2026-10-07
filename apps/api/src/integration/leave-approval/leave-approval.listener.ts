import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { ApprovalRequestCompletedEvent } from "@/core/events/events/approval-request-completed.event";
import { LeaveDecisionHandler } from "./leave-decision.handler.service";
import { LeaveApprovalLinkRepository } from "./leave-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";
import { TracingService } from "@/shared/context/tracing.service";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import { consumerIdempotency } from "@/infrastructure/database/schema/_shared/consumer-idempotency";

const CONSUMER_ID = "leave-approval-listener";

@Injectable()
export class LeaveApprovalListener implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly decisionHandler: LeaveDecisionHandler,
    private readonly linkRepo: LeaveApprovalLinkRepository,
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly requestContext: RequestContextService,
    private readonly tracing: TracingService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      LeaveApprovalListener.name,
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
    if (event.data.subjectType !== "leave") return;

    // Extract trace context from event payload (propagated via outbox)
    const trace = this.tracing.extractFromPayload(event.data);
    const rootCtx = this.requestContext.get();

    // Run the handler within a restored trace context + named span
    return this.requestContext.run(
      {
        ...rootCtx,
        requestId: rootCtx?.requestId ?? trace?.traceId ?? event.eventId,
        traceId: trace?.traceId ?? rootCtx?.traceId,
        correlationId: trace?.correlationId ?? rootCtx?.correlationId,
      } as any,
      async () => {
        await this.tracing.runWithSpan(
          "leave.integration.consume_engine_decision",
          async () => {
            await this.handleEngineDecisionInner(event);
          },
        );
      },
    );
  }

  private async handleEngineDecisionInner(
    event: ApprovalRequestCompletedEvent,
  ): Promise<void> {
    const { approvalRequestId, subjectId: leaveRequestId, outcome, decidedByUserId, completedAt } =
      event.data;
    const idempotentId = `${CONSUMER_ID}:${approvalRequestId}:${outcome}`;
    if (await this.isProcessed(idempotentId)) return;

    try {
      // Verify via correlation link
      const link = await this.linkRepo.findByApprovalRequestId(
        approvalRequestId,
      );
      if (!link) {
        this.logger.warn(
          `No leave link for approval ${approvalRequestId} — ignoring`,
        );
        return;
      }

      if (outcome === "approved") {
        await this.decisionHandler.handleApproval({
          leaveRequestId,
          decidedByUserId: decidedByUserId ?? "system",
          decidedAt: new Date(completedAt),
        });
      } else {
        await this.decisionHandler.handleRejection({
          leaveRequestId,
          decidedByUserId: decidedByUserId ?? "system",
          decidedAt: new Date(completedAt),
          rejectionReason: null,
        });
      }

      await this.linkRepo.updateStatus(leaveRequestId, outcome);
      await this.markProcessed(idempotentId);

      this.logger.log(
        `Engine ${outcome} applied to leave ${leaveRequestId}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed processing engine decision eventId=${event.eventId}: ${msg}`,
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
