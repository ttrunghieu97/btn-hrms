import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../../../../core/events/event-bus.interface";
import { EmployeeTerminatedEvent } from "../../../../core/events/events/employee-terminated.event";
import { EmployeeRehiredEvent } from "../../../../core/events/events/employee-rehired.event";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { EventIdempotencyRepository } from "../../../../infrastructure/repositories/event-idempotency.repository";

const CONSUMER_TERMINATED = "payroll:employee_terminated";
const CONSUMER_REHIRED = "payroll:employee_rehired";

@Injectable()
export class PayrollEmployeeTerminatedSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly idempotency: EventIdempotencyRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, PayrollEmployeeTerminatedSubscriber.name);
  }

  onModuleInit() {
    this.eventBus.on(EmployeeTerminatedEvent.eventType, async (event: EmployeeTerminatedEvent) => {
      if (await this.idempotency.isProcessed(CONSUMER_TERMINATED, event.eventId)) return;

      try {
        this.logger.log(`Payroll lifecycle: employee ${event.data.employeeId} terminated effective ${event.data.effectiveDate}`);
        await this.idempotency.markProcessed(CONSUMER_TERMINATED, event.eventId);
      } catch (err) {
        this.logger.error({
          event: "payroll_terminated_subscriber_failed",
          employeeId: event.data.employeeId,
          error: String(err),
        });
      }
    });

    this.eventBus.on(EmployeeRehiredEvent.eventType, async (event: EmployeeRehiredEvent) => {
      if (await this.idempotency.isProcessed(CONSUMER_REHIRED, event.eventId)) return;

      try {
        this.logger.log(`Payroll lifecycle: employee ${event.data.employeeId} rehired on ${event.data.hireDate}`);
        await this.idempotency.markProcessed(CONSUMER_REHIRED, event.eventId);
      } catch (err) {
        this.logger.error({
          event: "payroll_rehired_subscriber_failed",
          employeeId: event.data.employeeId,
          error: String(err),
        });
      }
    });
  }
}