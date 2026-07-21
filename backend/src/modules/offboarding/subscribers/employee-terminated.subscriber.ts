import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../../../core/events/event-bus.interface";
import { EmployeeTerminatedEvent } from "../../../core/events/events/employee-terminated.event";
import { StartOffboardingUseCase } from "../use-cases/start-offboarding.usecase";
import { EventIdempotencyRepository } from "../../../infrastructure/repositories/event-idempotency.repository";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { ContextLogger } from "../../../shared/logging/context-logger";

const CONSUMER_ID = "offboarding:employee_terminated";

@Injectable()
export class OffboardingEmployeeTerminatedSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly idempotency: EventIdempotencyRepository,
    private readonly startOffboarding: StartOffboardingUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, OffboardingEmployeeTerminatedSubscriber.name);
  }

  onModuleInit() {
    this.eventBus.on(EmployeeTerminatedEvent.eventType, async (event: EmployeeTerminatedEvent) => {
      if (await this.idempotency.isProcessed(CONSUMER_ID, event.eventId)) return;

      try {
        const { employeeId } = event.data;

        const result = await this.startOffboarding.execute(employeeId);

        if (result) {
          this.logger.log({
            event: "offboarding_auto_started",
            employeeId,
            processId: result.processId,
          });
        } else {
          this.logger.log({
            event: "offboarding_auto_start_skipped",
            employeeId,
            reason: "Active process exists or no template configured",
          });
        }

        await this.idempotency.markProcessed(CONSUMER_ID, event.eventId);
      } catch (err) {
        this.logger.error({
          event: "offboarding_subscriber_failed",
          employeeId: event.data.employeeId,
          error: String(err),
        });
      }
    });
  }
}
