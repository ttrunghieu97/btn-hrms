import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../event-bus.interface";
import { PayrollGeneratedEvent } from "../events/payroll-generated.event";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { ContextLogger } from "../../../shared/logging/context-logger";

import { EventIdempotencyRepository } from "../../../infrastructure/repositories/event-idempotency.repository";

@Injectable()
export class PayrollGeneratedHandler implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly requestContext: RequestContextService,
    private readonly idempotency?: EventIdempotencyRepository,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      PayrollGeneratedHandler.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      PayrollGeneratedEvent.name,
      async (event: PayrollGeneratedEvent) => {
        const action = async () => {
          this.logger.log(
            `Payroll generated: employee=${event.employeeId} payroll=${event.payrollId}`,
          );
        };

        if (this.idempotency && (event as any).eventId) {
          await this.idempotency.runIdempotent(
            "handler:payroll_generated",
            (event as any).eventId,
            action,
          );
        } else {
          await action();
        }
      },
    );
  }
}
