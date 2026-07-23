import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class DeactivateApprovalPolicyUseCase {
  constructor(private readonly repo: PlatformApprovalEngineRepository) {}

  async execute(id: string) {
    const existing = await this.repo.findPolicyById(id);
    if (!existing) throwNotFound("Approval policy not found", ERROR_CODES.APPROVAL_POLICY_NOT_FOUND, { id });

    const updated = await this.repo.deactivatePolicy(id);
    return updated!;
  }
}
