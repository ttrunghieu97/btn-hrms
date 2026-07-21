import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { PayrollProcessedEvent } from "@/core/events/events/payroll-processed.event";
import { PayrollApprovalPolicyResolver } from "./payroll-approval-policy.resolver";
import { PayrollApprovalGateway } from "./payroll-approval.gateway";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";

const CONSUMER_ID = "payroll-approval-integration";

@Injectable()
export class PayrollApprovalIntegrationHandler implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly policyResolver: PayrollApprovalPolicyResolver,
    private readonly gateway: PayrollApprovalGateway,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      PayrollApprovalIntegrationHandler.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      PayrollProcessedEvent.eventType,
      this.handlePayrollProcessed.bind(this),
    );
  }

  private async handlePayrollProcessed(
    event: PayrollProcessedEvent,
  ): Promise<void> {
    try {
      const { payrollRunId, processedByUserId } = event.data;

      const policyId = await this.policyResolver.resolve();
      if (!policyId) {
        this.logger.warn(`No approval policy found for payroll_approval`);
        return;
      }

      await this.gateway.requestApproval({
        policyId,
        payrollRunId,
        requestedByUserId: processedByUserId ?? null,
      });

      this.logger.log(`Approval requested for payroll run ${payrollRunId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process payroll approval for event ${event.eventId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
