import { Injectable } from "@nestjs/common";
import { ScheduleRepository } from "../repositories/schedule.repository";
import type { DailyScheduleRecord } from "../repositories/schedule.repository.contract";

@Injectable()
export class EnsureScheduleUseCase {
  constructor(private readonly repo: ScheduleRepository) {}

  async execute(date: string): Promise<DailyScheduleRecord> {
    return this.repo.ensureSchedule(date);
  }
}
