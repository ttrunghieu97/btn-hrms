import { Injectable } from "@nestjs/common";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";
import { UpdateNotificationTemplateDto } from "../dto/notification-template.dto";

@Injectable()
export class UpdateNotificationTemplateUseCase {
  constructor(
    private readonly repo: PlatformNotificationsRepository,
  ) {}

  async execute(id: string, dto: UpdateNotificationTemplateDto) {
    const existingTemplate = await this.repo.findTemplateById(id);

    if (!existingTemplate) {
      throwNotFound(`Template with ID ${id} not found`, ERROR_CODES.NOTIFICATION_TEMPLATE_NOT_FOUND, { templateId: id });
    }

    const template = await this.repo.updateTemplate(id, {
      ...dto,
      type: dto.type,
    });
    if (!template) throw new Error("Failed to update template");
    return template;
  }
}
