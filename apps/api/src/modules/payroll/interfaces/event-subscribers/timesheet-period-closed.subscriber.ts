import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../../../../core/events/event-bus.interface";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { EventIdempotencyRepository } from "../../../../infrastructure/repositories/event-idempotency.repository";

/**
 * Event type string emitted by PeriodLockService.close as
 * TimesheetPeriodClosedEvent (eventType = "timesheet.period.closed.v1").
 *
 * Semantic: Attendance has published an immutable snapshot for this period.
 * Payroll may consume it. Attendance does NOT instruct payroll to start.
 */
const TIMESHEET_PERIOD_CLOSED_EVENT_TYPE = "timesheet.period.closed.v1";
const CONSUMER = "payroll:timesheet_period_closed";

interface TimesheetPeriodClosedLike {
  eventId: string;
  data: { period: string; actorUserId: string; remarks: string; snapshotCount: number };
}

/**
 * Reacts to attendance period closure (immutable snapshot available).
 *
 * Attendance publishes facts; consumers decide what to do with those facts.
 * This subscriber acknowledges the publication and logs availability.
 * Payroll run generation remains a separate business decision.
 */
@Injectable()
export class PayrollTimesheetPeriodClosedSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly idempotency: EventIdempotencyRepository,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      PayrollTimesheetPeriodClosedSubscriber.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      TIMESHEET_PERIOD_CLOSED_EVENT_TYPE,
      async (event: TimesheetPeriodClosedLike) => {
        if (await this.idempotency.isProcessed(CONSUMER, event.eventId)) return;

        const { period, snapshotCount } = event.data;
        try {
          this.logger.log({
            event: "payroll_timesheet_period_closed_handled",
            period,
            snapshotCount,
            message: "Immutable attendance publication available for period",
          });
          await this.idempotency.markProcessed(CONSUMER, event.eventId);
        } catch (err) {
          this.logger.error({
            event: "payroll_timesheet_period_closed_failed",
            period,
            error: String(err),
          });
        }
      },
    );
  }
}
