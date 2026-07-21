import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import {
  EVENT_BUS_TOKEN as EVENT_BUS,
  IEventBus as EventBus,
} from "../../../core/events/event-bus.interface";
import { EmployeeHiredEvent } from "../../../core/events/events/employee-hired.event";
import { SendNotificationUseCase } from "../use-cases/send-notification.usecase";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

const CONSUMER_ID = "notifications:employee_hired";

@Injectable()
export class NotificationEmployeeHiredSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly sendNotification: SendNotificationUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      NotificationEmployeeHiredSubscriber.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      EmployeeHiredEvent.eventType,
      async (event: EmployeeHiredEvent) => {
        try {
          const { employeeId, userId, hiredByUserId } = event.data;
          await this.sendNotification.execute({
            userId,
            subject: "Chào mừng bạn gia nhập công ty",
            body: "Chúng tôi rất vui mừng chào đón bạn. Vui lòng hoàn thành các thủ tục nhập học trong thời gian sớm nhất.",
            context: {
              employeeId,
              hiredByUserId: hiredByUserId ?? undefined,
            },
          });
          this.logger.log({
            event: "notification_welcome_sent",
            employeeId,
            userId,
          });
        } catch (err) {
          this.logger.error({
            event: "notification_welcome_failed",
            employeeId: event.data.employeeId,
            error: String(err),
          });
        }
      },
    );
  }
}
