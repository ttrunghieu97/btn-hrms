import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { ApprovalRequestDecidedEvent } from "@/core/events/events/approval-request-decided.event";
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
      ApprovalRequestDecidedEvent.eventType,
      this.handleEngineDecision.bind(this),
    );
  }

  private async handleEngineDecision(
    event: ApprovalRequestDecidedEvent,
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
    event: ApprovalRequestDecidedEvent,
  ): Promise<void> {
    const idempotentId = `${CONSUMER_ID}:${event.data.approvalRequestId}:${event.data.decision}`;
    if (await this.isProcessed(idempotentId)) return;

    try {
      const { subjectId: leaveRequestId, decision, decidedByUserId, decidedAt } =
        event.data;

      // Verify via correlation link
      const link = await this.linkRepo.findByApprovalRequestId(
        event.data.approvalRequestId,
      );
      if (!link) {
        this.logger.warn(
          `No leave link for approval ${event.data.approvalRequestId} — ignoring`,
        );
        return;
      }

      if (decision === "approved") {
        await this.decisionHandler.handleApproval({
          leaveRequestId,
          decidedByUserId,
          decidedAt: new Date(decidedAt),
        });
      } else {
        await this.decisionHandler.handleRejection({
          leaveRequestId,
          decidedByUserId,
          decidedAt: new Date(decidedAt),
          rejectionReason: null,
        });
      }

      await this.linkRepo.updateStatus(leaveRequestId, decision);
      await this.markProcessed(idempotentId);

      this.logger.log(
        `Engine ${decision} applied to leave ${leaveRequestId}`,
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
