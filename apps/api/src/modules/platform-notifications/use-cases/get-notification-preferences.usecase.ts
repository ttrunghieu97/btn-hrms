import { Injectable } from "@nestjs/common";
import { PlatformNotificationsRepository } from "../repositories/platform-notifications.repository";

@Injectable()
export class GetNotificationPreferencesUseCase {
  constructor(
    private readonly repo: PlatformNotificationsRepository,
  ) {}

  async execute(userId: string) {
    let prefs = await this.repo.findPreferences(userId);

    // Create default preferences if none exist
    if (!prefs) {
      const newPrefs = await this.repo.insertDefaultPreferences(userId);
      prefs = newPrefs ?? undefined;
    }

    return prefs;
  }
}
