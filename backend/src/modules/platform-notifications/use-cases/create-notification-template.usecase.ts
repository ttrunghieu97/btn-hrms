import { Injectable } from "@nestjs/common";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";
import { CreateNotificationTemplateDto } from "../dto/notification-template.dto";

@Injectable()
export class CreateNotificationTemplateUseCase {
  constructor(
    private readonly repo: PlatformNotificationsRepository,
  ) {}

  async execute(dto: CreateNotificationTemplateDto) {
    const existingTemplate = await this.repo.findTemplateByName(dto.name);

    if (existingTemplate) {
      throwBadRequest(`Template with name ${dto.name} already exists`, ERROR_CODES.NOTIFICATION_TEMPLATE_ALREADY_EXISTS, { name: dto.name });
    }

    const template = await this.repo.insertTemplate({
      name: dto.name,
      type: dto.type,
      subject: dto.subject,
      body: dto.body,
    });
    if (!template) throw new Error("Failed to create template");
    return template;
  }
}
