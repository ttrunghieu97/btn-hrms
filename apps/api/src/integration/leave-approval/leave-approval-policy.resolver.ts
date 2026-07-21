import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "@/modules/platform-approval-engine/repositories/platform-approval-engine.repository";

@Injectable()
export class LeaveApprovalPolicyResolver {
  constructor(
    private readonly engineRepo: PlatformApprovalEngineRepository,
  ) {}

  async resolve(input: {
    leaveTypeId: string;
    employeeId: string;
  }): Promise<string | null> {
    const policy = await this.engineRepo.findActivePolicyByKey("leave_approval");
    return policy?.id ?? null;
  }
}
