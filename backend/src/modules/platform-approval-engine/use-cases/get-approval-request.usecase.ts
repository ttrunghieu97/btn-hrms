import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class GetApprovalRequestUseCase {
  constructor(private readonly repo: PlatformApprovalEngineRepository) {}

  async execute(id: string) {
    const result = await this.repo.findRequestWithSteps(id);
    if (!result) throwNotFound("Approval request not found", ERROR_CODES.APPROVAL_REQUEST_NOT_FOUND, { id });
    return result;
  }
}
