import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "../../../core/events/event-bus.interface";
import { SessionScheduledEvent } from "../../../core/events/events/session-scheduled.event";
import { SessionCancelledEvent } from "../../../core/events/events/session-cancelled.event";
import { SendNotificationUseCase } from "../../platform-notifications/use-cases/send-notification.usecase";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

@Injectable()
export class LearningSessionNotificationSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;
  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly sendNotification: SendNotificationUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, LearningSessionNotificationSubscriber.name);
  }

  onModuleInit() {
    this.eventBus.on(SessionScheduledEvent.eventType, async (event: SessionScheduledEvent) => {
      try {
        this.logger.log({ event: "session_scheduled", sessionId: event.data.sessionId, courseId: event.data.courseId, scheduledAt: event.data.scheduledAt });
      } catch (err) { this.logger.error({ event: "session_notification_failed", error: String(err) }); }
    });

    this.eventBus.on(SessionCancelledEvent.eventType, async (event: SessionCancelledEvent) => {
      try {
        this.logger.log({ event: "session_cancelled", sessionId: event.data.sessionId, courseId: event.data.courseId });
      } catch (err) { this.logger.error({ event: "session_notification_failed", error: String(err) }); }
    });
  }
}
