import { Injectable } from "@nestjs/common";
import { ScheduleRequestsRepository } from "../repositories/schedule-requests.repository";
import type { ScheduleRequestWithEmployee } from "../repositories/schedule-requests.repository.contract";

@Injectable()
export class ListScheduleRequestsUseCase {
  constructor(private readonly repo: ScheduleRequestsRepository) {}

  async execute(filters?: { status?: string; employeeId?: string }): Promise<ScheduleRequestWithEmployee[]> {
    return this.repo.findAll(filters);
  }
}
