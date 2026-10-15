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
        const existing =
          typeof this.repo.findNotificationById === "function"
            ? await this.repo.findNotificationById(notificationId)
            : null;
        const existingMeta =
          existing?.metadata && typeof existing.metadata === "object"
            ? (existing.metadata as Record<string, unknown>)
            : {};

        try {
          let result:
            | {
                provider?: string;
                simulated?: boolean;
                deliveryState?: string;
                externalDelivery?: boolean;
              }
            | undefined;

          switch (type) {
            case NotificationType.EMAIL:
              if (!email) {
                await this.repo.updateNotification(notificationId, {
                  status: "failed",
                  sentAt: null,
                  metadata: {
                    ...existingMeta,
                    provider: "none",
                    simulated: false,
                    deliveryState: "failed",
                    externalDelivery: false,
                    deliveryError: "Missing recipient email address",
                  },
                });
                return;
              }
              result = await this.emailDelivery.sendEmail({
                to: email,
                subject: subject || "(No subject)",
                body,
              });
              break;
            case NotificationType.SMS:
              result = await this.smsDelivery.sendSms({ userId, body });
              break;
            case NotificationType.PUSH:
              result = await this.pushDelivery.sendPush({
                userId,
                title: subject ?? undefined,
                body,
              });
              break;
            default:
              this.logger.warn(`Unknown channel type: ${String(type)}`);
              await this.repo.updateNotification(notificationId, {
                status: "failed",
                sentAt: null,
                metadata: {
                  ...existingMeta,
                  provider: "unknown",
                  simulated: false,
                  deliveryState: "unknown",
                  externalDelivery: false,
                  deliveryError: `Unknown channel type: ${String(type)}`,
                },
              });
              return;
          }

          if (!result || typeof result.provider !== "string") {
            await this.repo.updateNotification(notificationId, {
              status: "pending",
              sentAt: null,
              metadata: {
                ...existingMeta,
                provider: "unknown",
                simulated: false,
                deliveryState: "unknown",
                externalDelivery: false,
              },
            });
            return;
          }

          const isSimulated =
            result.provider === "simulated" ||
            result.provider === "noop" ||
            result.simulated === true ||
            result.deliveryState === "simulated";

          if (isSimulated) {
            await this.repo.updateNotification(notificationId, {
              status: "pending",
              sentAt: null,
              metadata: {
                ...existingMeta,
                provider: result.provider,
                simulated: true,
                deliveryState: "simulated",
                externalDelivery: false,
                simulatedAt: new Date().toISOString(),
              },
            });
            return;
          }

          const resolvedState =
            result.deliveryState === "delivered"
              ? "delivered"
              : "sent_to_provider";

          await this.repo.updateNotification(notificationId, {
            status: "sent",
            sentAt: new Date(),
            metadata: {
              ...existingMeta,
              provider: result.provider,
              simulated: false,
              deliveryState: resolvedState,
              externalDelivery: result.externalDelivery ?? true,
            },
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to deliver notification ${notificationId}: ${error instanceof Error ? error.message : String(error)}`,
          );
          await this.repo.updateNotification(notificationId, {
            status: "failed",
            sentAt: null,
            metadata: {
              ...existingMeta,
              deliveryState: "failed",
              externalDelivery: false,
              deliveryError: error instanceof Error ? error.message : String(error),
            },
          });
        }
      },
    );
  }
}



