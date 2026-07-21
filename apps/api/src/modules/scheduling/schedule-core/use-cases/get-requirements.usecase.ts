import { Injectable } from "@nestjs/common";
import { ScheduleRepository } from "../repositories/schedule.repository";
import type { ScheduleRequirementRecord } from "../repositories/schedule.repository.contract";

@Injectable()
export class GetRequirementsUseCase {
  constructor(private readonly repo: ScheduleRepository) {}

  async execute(date: string): Promise<{ scheduleId: string; rows: ScheduleRequirementRecord[] }> {
    const schedule = await this.repo.ensureSchedule(date);
    const rows = await this.repo.getRequirements(schedule.id);
    return { scheduleId: schedule.id, rows };
  }
}
