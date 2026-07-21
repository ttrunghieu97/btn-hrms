import { Injectable } from "@nestjs/common";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";

@Injectable()
export class GetNotificationTemplateUseCase {
  constructor(
    private readonly repo: PlatformNotificationsRepository,
  ) {}

  async execute(id: string) {
    const template = await this.repo.findTemplateById(id);
    if (!template) {
      throwNotFound(`Template with ID ${id} not found`, ERROR_CODES.NOTIFICATION_TEMPLATE_NOT_FOUND, { templateId: id });
    }
    return template;
  }
}
