import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { PlatformApprovalEngineDomainModule } from "../platform-approval-engine/platform-approval-engine.module";
import { PlatformNotificationsController } from "./platform-notifications.controller";
import { EmailDeliveryService } from "./channels/email-delivery.service";
import { PushDeliveryService } from "./channels/push-delivery.service";
import { SmsDeliveryService } from "./channels/sms-delivery.service";
import { PlatformNotificationsRepository } from "./repositories/platform-notifications.repository";
import { DomainEventsNotificationsHandler } from "./handlers/domain-events-notifications.handler";
import { NotificationEmployeeHiredSubscriber } from "./subscribers/employee-hired.subscriber";
import { NotificationDeliveryHandler } from "./handlers/notification-delivery.handler";
import { CreateNotificationTemplateUseCase } from "./use-cases/create-notification-template.usecase";
import { UpdateNotificationTemplateUseCase } from "./use-cases/update-notification-template.usecase";
import { GetNotificationTemplateUseCase } from "./use-cases/get-notification-template.usecase";
import { ListNotificationTemplatesUseCase } from "./use-cases/list-notification-templates.usecase";
import { GetNotificationPreferencesUseCase } from "./use-cases/get-notification-preferences.usecase";
import { UpdateNotificationPreferencesUseCase } from "./use-cases/update-notification-preferences.usecase";
import { GetUserNotificationsUseCase } from "./use-cases/get-user-notifications.usecase";
import { SendNotificationUseCase } from "./use-cases/send-notification.usecase";

@Module({
  imports: [DatabaseModule, PlatformApprovalEngineDomainModule],
  controllers: [PlatformNotificationsController],
  providers: [
    PlatformNotificationsRepository,
    EmailDeliveryService,
    SmsDeliveryService,
    PushDeliveryService,
    DomainEventsNotificationsHandler,
    NotificationEmployeeHiredSubscriber,
    NotificationDeliveryHandler,
    CreateNotificationTemplateUseCase,
    UpdateNotificationTemplateUseCase,
    GetNotificationTemplateUseCase,
    ListNotificationTemplatesUseCase,
    GetNotificationPreferencesUseCase,
    UpdateNotificationPreferencesUseCase,
    GetUserNotificationsUseCase,
    SendNotificationUseCase,
  ],
  exports: [SendNotificationUseCase],
})
export class PlatformNotificationsDomainModule {}



