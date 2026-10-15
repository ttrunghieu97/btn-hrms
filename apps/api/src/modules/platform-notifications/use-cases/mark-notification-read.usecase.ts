import { Injectable } from "@nestjs/common";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(private readonly repo: PlatformNotificationsRepository) {}

  async execute(userId: string, id: string) {
    return this.repo.markNotificationRead(userId, id);
  }
}
