import { Injectable, Logger } from "@nestjs/common";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { NotificationDeliveryEvent } from "../../../core/events/events/notification-delivery.event";
import { SendNotificationDto } from "../dto/send-notification.dto";
import { NotificationType } from "../dto/notification-template.dto";

function renderText(
  text: string | null | undefined,
  context?: Record<string, any>,
) {
  if (!text) return text ?? null;
  if (!context) return text;

  let rendered = text;
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    rendered = rendered.replace(regex, String(value));
  }
  return rendered;
}

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    private readonly repo: PlatformNotificationsRepository,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(dto: SendNotificationDto) {
    const results = await this.executeBatch([dto]);
    return results[0];
  }

  async executeBatch(dtos: SendNotificationDto[]) {
    if (dtos.length === 0) return [];

    const userIds = [...new Set(dtos.map((d) => d.userId))];
    const templateNames = [
      ...new Set(dtos.map((d) => d.templateName).filter(Boolean) as string[]),
    ];

    const [users, templates, preferences] = await Promise.all([
      this.repo.findUserIdentities(userIds),
      templateNames.length > 0
        ? Promise.all(templateNames.map((name) => this.repo.findTemplateByName(name)))
        : [],
      this.repo.findPreferencesBatch(userIds),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const templateMap = new Map(
      templates.filter(Boolean).map((t) => [t!.name, t!]),
    );
    const prefMap = new Map(preferences.map((p) => [p.userId, p]));

    const notificationInputs: any[] = [];
    const executionContexts: any[] = [];

    for (const dto of dtos) {
      const user = userMap.get(dto.userId);
      if (!user) {
        this.logger.warn(`User ${dto.userId} not found for notification`);
        continue;
      }

      let requestedType = dto.preferredType || NotificationType.IN_APP;
      let subject = dto.subject ?? null;
      let body = dto.body ?? null;
      let templateId: string | null = null;

      if (dto.templateName) {
        const template = templateMap.get(dto.templateName);
        if (!template) {
          this.logger.warn(`Template ${dto.templateName} not found`);
          continue;
        }
        templateId = template.id;
        if (!dto.preferredType) requestedType = template.type as NotificationType;
        subject = subject ?? template.subject ?? null;
        body = body ?? template.body ?? null;
      }

      if (!body) continue;

      const renderedSubject = renderText(subject, dto.context);
      const renderedBody = renderText(body, dto.context);
      if (!renderedBody) continue;

      let prefs = prefMap.get(dto.userId);
      if (!prefs) {
        prefs = (await this.repo.insertDefaultPreferences(dto.userId)) ?? undefined;
      }

      const isEnabled =
        requestedType === NotificationType.EMAIL
          ? prefs?.emailEnabled
          : requestedType === NotificationType.SMS
            ? prefs?.smsEnabled
            : requestedType === NotificationType.PUSH
              ? prefs?.pushEnabled
              : true;

      let effectiveType = requestedType;
      const fallbackReasons: string[] = [];

      if (!isEnabled && effectiveType !== NotificationType.IN_APP) {
        fallbackReasons.push("preference_disabled");
        effectiveType = NotificationType.IN_APP;
      }

      if (effectiveType === NotificationType.EMAIL && !user.email) {
        fallbackReasons.push("missing_email");
        effectiveType = NotificationType.IN_APP;
      }

      const baseMetadata: Record<string, any> = {
        requestedType,
        effectiveType,
        templateName: dto.templateName ?? null,
        fallbackReasons: fallbackReasons.length ? fallbackReasons : undefined,
      };

      notificationInputs.push({
        userId: dto.userId,
        templateId,
        type: effectiveType,
        status: effectiveType === NotificationType.IN_APP ? "sent" : "pending",
        subject: renderedSubject,
        body: renderedBody,
        metadata: baseMetadata,
        sentAt: effectiveType === NotificationType.IN_APP ? new Date() : null,
      });

      executionContexts.push({
        dto,
        user,
        effectiveType,
        renderedSubject,
        renderedBody,
        baseMetadata,
      });
    }

    const createdNotifications = await this.repo.insertNotifications(notificationInputs);
    const finalResults: any[] = [];

    // Deliver external
    for (let i = 0; i < executionContexts.length; i++) {
      const ctx = executionContexts[i];
      const notification = createdNotifications[i];
      if (!notification) continue;

      if (ctx.effectiveType === NotificationType.IN_APP) {
        finalResults.push({
          notification,
          deliveredMessage: {
            channel: ctx.effectiveType,
            subject: ctx.renderedSubject,
            body: ctx.renderedBody,
          },
        });
        continue;
      }

      // Stage in outbox for background delivery
      await this.eventOutbox.stage(
        new NotificationDeliveryEvent({
          notificationId: notification.id,
          userId: ctx.user.id,
          type: ctx.effectiveType,
          email: ctx.user.email ?? undefined,
          subject: ctx.renderedSubject,
          body: ctx.renderedBody,
        }),
      );

      finalResults.push({
        notification,
        deliveredMessage: {
          channel: ctx.effectiveType,
          subject: ctx.renderedSubject,
          body: ctx.renderedBody,
        },
      });
    }

    return finalResults;
  }
}
