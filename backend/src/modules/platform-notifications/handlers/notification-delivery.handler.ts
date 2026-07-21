import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  EVENT_BUS_TOKEN as EVENT_BUS,
  IEventBus as EventBus,
} from "../../../core/events/event-bus.interface";
import { NotificationDeliveryEvent } from "../../../core/events/events/notification-delivery.event";
import { EmailDeliveryService } from "../channels/email-delivery.service";
import { PushDeliveryService } from "../channels/push-delivery.service";
import { SmsDeliveryService } from "../channels/sms-delivery.service";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";
import { NotificationType } from "../dto/notification-template.dto";

@Injectable()
export class NotificationDeliveryHandler implements OnModuleInit {
  private readonly logger = new Logger(NotificationDeliveryHandler.name);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly smsDelivery: SmsDeliveryService,
    private readonly pushDelivery: PushDeliveryService,
    private readonly repo: PlatformNotificationsRepository,
  ) {}

  onModuleInit() {
    this.eventBus.on(
      NotificationDeliveryEvent.eventType,
      async (event: NotificationDeliveryEvent) => {
        const { notificationId, userId, type, email, subject, body } = event.data;

        try {
          switch (type) {
            case NotificationType.EMAIL:
              if (email) {
                await this.emailDelivery.sendEmail({
                  to: email,
                  subject: subject || "(No subject)",
                  body,
                });
              }
              break;
            case NotificationType.SMS:
              await this.smsDelivery.sendSms({ userId, body });
              break;
            case NotificationType.PUSH:
              await this.pushDelivery.sendPush({
                userId,
                title: subject ?? undefined,
                body,
              });
              break;
            default:
              this.logger.warn(`Unknown channel type: ${String(type)}`);
              return;
          }

          await this.repo.updateNotification(notificationId, {
            status: "sent",
            sentAt: new Date(),
          });
        } catch (error: unknown  ) {
          this.logger.error(
            `Failed to deliver notification ${notificationId}: ${error instanceof Error ? error.message : String(error)}`,
          );
          await this.repo.updateNotification(notificationId, {
            status: "failed",
            metadata: { deliveryError: error instanceof Error ? error.message : String(error) },
          });
        }
      },
    );
  }
}



