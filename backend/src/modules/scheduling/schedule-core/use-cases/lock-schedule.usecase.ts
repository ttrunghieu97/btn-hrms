import { Injectable } from "@nestjs/common";
import { ScheduleRepository } from "../repositories/schedule.repository";
import type { DailyScheduleRecord } from "../repositories/schedule.repository.contract";
import { throwBadRequest, throwForbidden } from "../../../../shared/utils/http-error";

@Injectable()
export class LockScheduleUseCase {
  constructor(private readonly repo: ScheduleRepository) {}

  async execute(date: string, userId: string, isAdmin: boolean): Promise<DailyScheduleRecord> {
    const schedule = await this.repo.getSchedule(date);
    if (!schedule) {
      throwBadRequest(`No schedule found for ${date}`, "SCHEDULE_NOT_FOUND");
    }
    if (schedule.status === "locked") {
      throwBadRequest(`Schedule for ${date} is already locked`, "SCHEDULE_LOCKED");
    }
    if (schedule.status !== "published" && !isAdmin) {
      throwForbidden("Only published schedules can be locked without admin override", "SCHEDULE_NOT_PUBLISHED");
    }

    const updated = await this.repo.updateStatus(schedule.id, "locked", userId);
    return updated!;
  }
}
