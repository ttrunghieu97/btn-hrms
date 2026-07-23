import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { ApprovalRequestDecidedEvent } from "@/core/events/events/approval-request-decided.event";
import { PayrollDecisionHandler } from "./payroll-decision.handler.service";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";

const CONSUMER_ID = "payroll-approval-listener";

@Injectable()
export class PayrollApprovalListener implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly decisionHandler: PayrollDecisionHandler,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      PayrollApprovalListener.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      ApprovalRequestDecidedEvent.eventType,
      this.handleApprovalRequestDecided.bind(this),
    );
  }

  private async handleApprovalRequestDecided(
    event: ApprovalRequestDecidedEvent,
  ): Promise<void> {
    const { approvalRequestId, subjectType, decision, decidedByUserId, decidedAt } = event.data;
    if (subjectType !== "payroll") return;

    try {
      if (decision === "approved") {
        await this.decisionHandler.handleApproval({
          approvalRequestId,
          decidedByUserId,
          decidedAt: new Date(decidedAt),
        });
      } else if (decision === "rejected") {
        await this.decisionHandler.handleRejection({
          approvalRequestId,
          decidedByUserId,
          decidedAt: new Date(decidedAt),
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle payroll approval decision for request ${approvalRequestId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
