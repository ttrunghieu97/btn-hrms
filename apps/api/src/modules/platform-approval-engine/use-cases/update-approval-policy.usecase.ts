import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { UpdateApprovalPolicyDto } from "../dto/update-approval-policy.dto";

@Injectable()
export class UpdateApprovalPolicyUseCase {
  constructor(private readonly repo: PlatformApprovalEngineRepository) {}

  async execute(id: string, dto: UpdateApprovalPolicyDto) {
    const existing = await this.repo.findPolicyById(id);
    if (!existing) throwNotFound("Approval policy not found", ERROR_CODES.APPROVAL_POLICY_NOT_FOUND, { id });

    const updated = await this.repo.updatePolicy(id, dto);
    return updated!;
  }
}
