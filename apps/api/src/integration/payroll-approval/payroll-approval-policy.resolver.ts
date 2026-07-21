import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "@/modules/platform-approval-engine/repositories/platform-approval-engine.repository";

@Injectable()
export class PayrollApprovalPolicyResolver {
  constructor(
    private readonly engineRepo: PlatformApprovalEngineRepository,
  ) {}

  async resolve(): Promise<string | null> {
    const policy = await this.engineRepo.findActivePolicyByKey("payroll_approval");
    return policy?.id ?? null;
  }
}
