import { Inject, Injectable, OnModuleInit, Optional } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { ApprovalRequestCompletedEvent } from "@/core/events/events/approval-request-completed.event";
import { PayrollDecisionHandler } from "./payroll-decision.handler.service";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";
import { EventIdempotencyRepository } from "@/infrastructure/repositories/event-idempotency.repository";

const CONSUMER_ID = "payroll-approval-listener";

@Injectable()
export class PayrollApprovalListener implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly decisionHandler: PayrollDecisionHandler,
    private readonly requestContext: RequestContextService,
    @Optional() private readonly idempotency?: EventIdempotencyRepository,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      PayrollApprovalListener.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      ApprovalRequestCompletedEvent.eventType,
      this.handleApprovalRequestCompleted.bind(this),
    );
  }

  private async handleApprovalRequestCompleted(
    event: ApprovalRequestCompletedEvent,
  ): Promise<void> {
    const { approvalRequestId, subjectType, outcome, decidedByUserId, completedAt } = event.data;
    if (subjectType !== "payroll") return;

    const idempotentEventId = event.eventId || approvalRequestId;
    if (
      this.idempotency &&
      idempotentEventId &&
      (await this.idempotency.isProcessed(CONSUMER_ID, idempotentEventId))
    ) {
      return;
    }

    try {
      if (outcome === "approved") {
        await this.decisionHandler.handleApproval({
          approvalRequestId,
          decidedByUserId: decidedByUserId ?? null,
          decidedAt: new Date(completedAt),
        });
      } else if (outcome === "rejected" || outcome === "cancelled") {
        await this.decisionHandler.handleRejection({
          approvalRequestId,
          decidedByUserId: decidedByUserId ?? null,
          decidedAt: new Date(completedAt),
        });
      }

      if (this.idempotency && idempotentEventId) {
        await this.idempotency.markProcessed(CONSUMER_ID, idempotentEventId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle payroll approval decision for request ${approvalRequestId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}
