import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "../../../core/events/event-bus.interface";
import { BenefitEnrollmentApprovedEvent } from "../../../core/events/events/benefit-enrollment-approved.event";
import { BenefitEnrollmentTerminatedEvent } from "../../../core/events/events/benefit-enrollment-terminated.event";
import { SendNotificationUseCase } from "../../platform-notifications/use-cases/send-notification.usecase";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

@Injectable()
export class BenefitEnrollmentNotificationSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;
  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly sendNotification: SendNotificationUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, BenefitEnrollmentNotificationSubscriber.name);
  }

  onModuleInit() {
    this.eventBus.on(BenefitEnrollmentApprovedEvent.eventType, async (event: BenefitEnrollmentApprovedEvent) => {
      try {
        await this.sendNotification.execute({
          userId: event.data.employeeId,
          subject: "Benefit enrollment approved",
          body: "Your benefit enrollment has been approved and is now active.",
          context: { enrollmentId: event.data.enrollmentId, planId: event.data.planId },
        });
        this.logger.log({ event: "benefits_enrollment_notified", enrollmentId: event.data.enrollmentId });
      } catch (err) { this.logger.error({ event: "benefits_notification_failed", error: String(err) }); }
    });
  }
}
