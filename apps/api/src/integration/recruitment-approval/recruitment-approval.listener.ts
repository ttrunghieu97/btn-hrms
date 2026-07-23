import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { ApprovalRequestDecidedEvent } from "@/core/events/events/approval-request-decided.event";
import { RecruitmentDecisionHandler } from "./recruitment-decision.handler.service";
import { RecruitmentApprovalLinkRepository } from "./recruitment-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";
import { TracingService } from "@/shared/context/tracing.service";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import { consumerIdempotency } from "@/infrastructure/database/schema/_shared/consumer-idempotency";
import { RECRUITMENT_SUBJECT_TYPES } from "./recruitment-approval.gateway";

const CONSUMER_ID = "recruitment-approval-listener";

// Engine subjectType string → our internal subject discriminator.
const SUBJECT_FROM_ENGINE: Record<string, "requisition" | "offer"> = {
  [RECRUITMENT_SUBJECT_TYPES.requisition]: "requisition",
  [RECRUITMENT_SUBJECT_TYPES.offer]: "offer",
};

@Injectable()
export class RecruitmentApprovalListener implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly decisionHandler: RecruitmentDecisionHandler,
    private readonly linkRepo: RecruitmentApprovalLinkRepository,
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly requestContext: RequestContextService,
    private readonly tracing: TracingService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      RecruitmentApprovalListener.name,
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
          "recruitment.integration.consume_engine_decision",
          async () => {
            await this.handleEngineDecisionInner(event, subjectType);
          },
        );
      },
    );
  }

  private async handleEngineDecisionInner(
    event: ApprovalRequestDecidedEvent,
    subjectType: "requisition" | "offer",
  ): Promise<void> {
    const idempotentId = `${CONSUMER_ID}:${event.data.approvalRequestId}:${event.data.decision}`;
    if (await this.isProcessed(idempotentId)) return;

    try {
      const { subjectId, decision, decidedAt } = event.data;

      const link = await this.linkRepo.findByApprovalRequestId(
        event.data.approvalRequestId,
      );
      if (!link) {
        this.logger.warn(
          `No recruitment link for approval ${event.data.approvalRequestId} — ignoring`,
        );
        return;
      }

      await this.decisionHandler.handleDecision({
        subjectType,
        subjectId,
        decision,
        decidedAt: new Date(decidedAt),
      });

      await this.linkRepo.updateStatus(event.data.approvalRequestId, decision);
      await this.markProcessed(idempotentId);
      this.logger.log(`Engine ${decision} applied to ${subjectType} ${subjectId}`);
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
