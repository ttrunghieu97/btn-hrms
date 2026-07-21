import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../infrastructure/database/database-client.type";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../../../core/events/event-bus.interface";
import { EmployeeTerminatedEvent } from "../../../core/events/events/employee-terminated.event";
import { EmployeeRehiredEvent } from "../../../core/events/events/employee-rehired.event";
import { EmployeeStatusChangedEvent } from "../../../core/events/events/employee-status-changed.event";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { EventIdempotencyRepository } from "../../../infrastructure/repositories/event-idempotency.repository";

@Injectable()
export class AttendanceEmployeeLifecycleSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly requestContext: RequestContextService,
    private readonly idempotency: EventIdempotencyRepository,
  ) {
    this.logger = new ContextLogger(requestContext, AttendanceEmployeeLifecycleSubscriber.name);
  }

  onModuleInit() {
    this.eventBus.on(EmployeeTerminatedEvent.eventType, async (event: EmployeeTerminatedEvent) => {
      const consumerId = "attendance:employee_terminated";
      if (await this.idempotency.isProcessed(consumerId, event.eventId)) return;
      try {
        this.logger.log(`Ending attendance eligibility for terminated employee ${event.data.employeeId}`);
        await this.idempotency.markProcessed(consumerId, event.eventId);
      } catch (err) {
        this.logger.error({ event: "attendance_terminated_failed", employeeId: event.data.employeeId, error: String(err) });
      }
    });

    this.eventBus.on(EmployeeRehiredEvent.eventType, async (event: EmployeeRehiredEvent) => {
      const consumerId = "attendance:employee_rehired";
      if (await this.idempotency.isProcessed(consumerId, event.eventId)) return;
      try {
        this.logger.log(`Restoring attendance eligibility for rehired employee ${event.data.employeeId}`);
        await this.idempotency.markProcessed(consumerId, event.eventId);
      } catch (err) {
        this.logger.error({ event: "attendance_rehired_failed", employeeId: event.data.employeeId, error: String(err) });
      }
    });

    this.eventBus.on(EmployeeStatusChangedEvent.eventType, async (event: EmployeeStatusChangedEvent) => {
      const consumerId = "attendance:employee_status_changed";
      if (event.data.fromStatus === event.data.toStatus) return;
      if (await this.idempotency.isProcessed(consumerId, event.eventId)) return;
      try {
        this.logger.log(`Attendance eligibility update for employee ${event.data.employeeId}: ${event.data.fromStatus} -> ${event.data.toStatus}`);
        await this.idempotency.markProcessed(consumerId, event.eventId);
      } catch (err) {
        this.logger.error({ event: "attendance_status_changed_failed", employeeId: event.data.employeeId, error: String(err) });
      }
    });
  }
}
