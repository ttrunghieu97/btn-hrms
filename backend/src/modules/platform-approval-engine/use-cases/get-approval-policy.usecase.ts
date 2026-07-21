import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class GetApprovalPolicyUseCase {
  constructor(private readonly repo: PlatformApprovalEngineRepository) {}

  async execute(id: string) {
    const policy = await this.repo.findPolicyById(id);
    if (!policy) throwNotFound("Approval policy not found", ERROR_CODES.APPROVAL_POLICY_NOT_FOUND, { id });
    return policy;
  }
}
