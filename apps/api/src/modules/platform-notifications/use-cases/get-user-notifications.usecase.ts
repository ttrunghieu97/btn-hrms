import { Injectable } from "@nestjs/common";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";

@Injectable()
export class GetUserNotificationsUseCase {
  constructor(
    private readonly repo: PlatformNotificationsRepository,
  ) {}

  async execute(userId: string) {
    return this.repo.listUserNotifications(userId);
  }
}
