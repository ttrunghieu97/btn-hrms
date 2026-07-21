import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../../../../core/events/event-bus.interface";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { EventIdempotencyRepository } from "../../../../infrastructure/repositories/event-idempotency.repository";
import { CalculateFinalSettlementUseCase } from "../../payroll/use-cases/calculate-final-settlement.usecase";

/**
 * Runtime event type emitted by offboarding's OffboardingCompletedEvent.
 * Held as a local const (not imported from the offboarding module) to keep
 * payroll decoupled from another context's domain classes.
 */
const OFFBOARDING_COMPLETED_EVENT_TYPE = "offboarding.completed.v1";
const CONSUMER = "payroll:offboarding_completed";

interface OffboardingCompletedLike {
  eventId: string;
  data: { processId: string; employeeId: string };
}

/**
 * When an offboarding process completes, payroll computes the departing
 * employee's final settlement and reports the result back onto the offboarding
 * settlement link (via the settlement-status writer port). Idempotent per
 * eventId so redelivery is safe.
 */
@Injectable()
export class PayrollOffboardingCompletedSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly idempotency: EventIdempotencyRepository,
    private readonly calculateFinalSettlement: CalculateFinalSettlementUseCase,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      PayrollOffboardingCompletedSubscriber.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      OFFBOARDING_COMPLETED_EVENT_TYPE,
      async (event: OffboardingCompletedLike) => {
        if (await this.idempotency.isProcessed(CONSUMER, event.eventId)) return;

        const { processId, employeeId } = event.data;
        try {
          const result = await this.calculateFinalSettlement.execute({
            processId,
            employeeId,
          });
          this.logger.log({
            event: "payroll_offboarding_completed_handled",
            processId,
            employeeId,
            status: result.status,
            payrollRef: result.payrollRef,
          });
          await this.idempotency.markProcessed(CONSUMER, event.eventId);
        } catch (err) {
          // Leave un-marked so redelivery can retry the settlement.
          this.logger.error({
            event: "payroll_offboarding_completed_failed",
            processId,
            employeeId,
            error: String(err),
          });
        }
      },
    );
  }
}
