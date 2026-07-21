import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import {
  EVENT_BUS_TOKEN as EVENT_BUS,
  IEventBus as EventBus,
} from "../../../../core/events/event-bus.interface";
import { EmployeeTerminatedEvent } from "../../../../core/events/events/employee-terminated.event";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { EventIdempotencyRepository } from "../../../../infrastructure/repositories/event-idempotency.repository";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";
import { SendNotificationUseCase } from "../../../platform-notifications/use-cases/send-notification.usecase";

const CONSUMER_ID = "asset-management:employee_terminated";

/**
 * When an employee is terminated, surface any assets they still hold so the
 * offboarding actor can arrange their return. This never mutates holdings —
 * returns remain an explicit issue-lifecycle operation — it only signals.
 */
@Injectable()
export class AssetEmployeeTerminatedSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly requestContext: RequestContextService,
    private readonly issueRepo: AssetIssueRepository,
    private readonly sendNotification: SendNotificationUseCase,
    private readonly idempotency: EventIdempotencyRepository,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      AssetEmployeeTerminatedSubscriber.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      EmployeeTerminatedEvent.eventType,
      async (event: EmployeeTerminatedEvent) => {
        if (await this.idempotency.isProcessed(CONSUMER_ID, event.eventId)) return;
        try {
          await this.handleTerminated(event);
          await this.idempotency.markProcessed(CONSUMER_ID, event.eventId);
        } catch (err) {
          this.logger.error({
            event: "asset_terminated_failed",
            employeeId: event.data.employeeId,
            error: String(err),
          });
        }
      },
    );
  }

  private async handleTerminated(
    event: EmployeeTerminatedEvent,
  ): Promise<void> {
    const { employeeId, terminatedByUserId } = event.data;
    const holdings = await this.issueRepo.findOpenLinesByEmployee(employeeId);
    if (holdings.length === 0) {
      this.logger.log(
        `Terminated employee ${employeeId} holds no assets — nothing to reclaim`,
      );
      return;
    }

    this.logger.warn(
      `Terminated employee ${employeeId} still holds ${holdings.length} asset line(s) pending return`,
    );

    if (!terminatedByUserId) return;
    try {
      await this.sendNotification.execute({
        userId: terminatedByUserId,
        subject: "Outstanding assets on termination",
        body: `Terminated employee still holds {{count}} asset line(s) that need to be returned.`,
        context: {
          employeeId,
          count: holdings.length,
        },
      });
    } catch (error) {
      // Never fail the consumer because the signal could not be sent.
      this.logger.warn(
        `Failed to send outstanding-assets notification for employee ${employeeId}: ${String(error)}`,
      );
    }
  }

}
