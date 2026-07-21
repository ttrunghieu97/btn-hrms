import { Injectable } from "@nestjs/common";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";

@Injectable()
export class ListNotificationTemplatesUseCase {
  constructor(
    private readonly repo: PlatformNotificationsRepository,
  ) {}

  async execute() {
    return this.repo.listTemplates();
  }
}
