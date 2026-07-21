import { Injectable } from "@nestjs/common";
import { ScheduleRepository } from "../repositories/schedule.repository";
import type { DailyScheduleRecord } from "../repositories/schedule.repository.contract";
import { throwBadRequest } from "../../../../shared/utils/http-error";

@Injectable()
export class PublishScheduleUseCase {
  constructor(private readonly repo: ScheduleRepository) {}

  async execute(date: string, userId: string): Promise<DailyScheduleRecord> {
    const schedule = await this.repo.getSchedule(date);
    if (!schedule) {
      throwBadRequest(`No schedule found for ${date}`, "SCHEDULE_NOT_FOUND");
    }
    if (schedule.status === "locked") {
      throwBadRequest(`Schedule for ${date} is locked`, "SCHEDULE_LOCKED");
    }

    const updated = await this.repo.updateStatus(schedule.id, "published", userId);
    return updated!;
  }
}
