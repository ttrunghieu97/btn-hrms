import { Injectable } from "@nestjs/common";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";
import { GetNotificationPreferencesUseCase } from "./get-notification-preferences.usecase";
import { UpdateNotificationPreferencesDto } from "../dto/notification-preferences.dto";

@Injectable()
export class UpdateNotificationPreferencesUseCase {
  constructor(
    private readonly repo: PlatformNotificationsRepository,
    private readonly getPreferences: GetNotificationPreferencesUseCase,
  ) {}

  async execute(userId: string, dto: UpdateNotificationPreferencesDto) {
    // Ensure preferences exist
    await this.getPreferences.execute(userId);

    const prefs = await this.repo.updatePreferences(userId, dto as any);
    if (!prefs) throw new Error("Failed to update preferences");
    return prefs;
  }
}
