import { DomainEvent } from "../domain-event.base";

export class NotificationDeliveryEvent extends DomainEvent {
  static readonly eventType = "platform.notification.delivery_requested";

  constructor(
    public readonly data: {
      notificationId: string;
      userId: string;
      type: string;
      email?: string;
      subject: string | null;
      body: string;
    },
  ) {
    super(NotificationDeliveryEvent.eventType, "platform-notifications", data);
  }
}
