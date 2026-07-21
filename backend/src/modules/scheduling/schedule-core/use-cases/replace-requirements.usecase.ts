import { Injectable } from "@nestjs/common";
import { ScheduleRepository } from "../repositories/schedule.repository";
import type { ScheduleRequirementRecord, RequirementInput } from "../repositories/schedule.repository.contract";
import { throwBadRequest } from "../../../../shared/utils/http-error";

@Injectable()
export class ReplaceRequirementsUseCase {
  constructor(
    private readonly repo: ScheduleRepository,
  ) {}

  async execute(
    date: string,
    requirements: RequirementInput[]
  ): Promise<{ scheduleId: string; rows: ScheduleRequirementRecord[] }> {
    for (const r of requirements) {
      if (r.requiredCount < 1) {
        throwBadRequest("requiredCount must be >= 1", "VALIDATION_ERROR");
      }
    }

    const schedule = await this.repo.ensureSchedule(date);
    const rows = await this.repo.replaceRequirements(schedule.id, requirements);
    return { scheduleId: schedule.id, rows };
  }

  async upsert(
    date: string,
    upserts: RequirementInput[]
  ): Promise<{ scheduleId: string; rows: ScheduleRequirementRecord[] }> {
    const schedule = await this.repo.ensureSchedule(date);
    await this.repo.upsertRequirements(schedule.id, upserts);
    const rows = await this.repo.getRequirements(schedule.id);
    return { scheduleId: schedule.id, rows };
  }
}