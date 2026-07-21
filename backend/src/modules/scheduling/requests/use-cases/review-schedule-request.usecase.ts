import { Injectable } from "@nestjs/common";
import { ScheduleRequestsRepository } from "../repositories/schedule-requests.repository";
import type { ScheduleRequestRecord, RequestStatus } from "../repositories/schedule-requests.repository.contract";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";

@Injectable()
export class ReviewScheduleRequestUseCase {
  constructor(private readonly repo: ScheduleRequestsRepository) {}

  async execute(
    id: string,
    action: RequestStatus,
    reviewedBy: string
  ): Promise<ScheduleRequestRecord> {
    const request = await this.repo.findById(id);
    if (!request) {
      throwNotFound(`Schedule request ${id} not found`, "REQUEST_NOT_FOUND");
    }

    if (request.status !== "PENDING") {
      throwBadRequest(
        `Request ${id} is already ${request.status}`,
        "REQUEST_ALREADY_REVIEWED"
      );
    }

    const updated = await this.repo.updateStatus(id, action, reviewedBy);
    if (!updated) {
      throwNotFound(`Schedule request ${id} not found after update`, "REQUEST_NOT_FOUND");
    }
    return updated;
  }
}
