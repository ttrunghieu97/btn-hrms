import { Injectable } from "@nestjs/common";
import { ScheduleRequestsRepository } from "../repositories/schedule-requests.repository";
import type { ScheduleRequestRecord, RequestType } from "../repositories/schedule-requests.repository.contract";

@Injectable()
export class CreateScheduleRequestUseCase {
  constructor(private readonly repo: ScheduleRequestsRepository) {}

  async execute(
    employeeId: string,
    data: { requestType: RequestType; date: string; reason?: string }
  ): Promise<ScheduleRequestRecord> {
    return this.repo.create({
      employeeId,
      date: data.date,
      requestType: data.requestType,
      reason: data.reason,
    });
  }
}
