import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "@/modules/platform-approval-engine/repositories/platform-approval-engine.repository";
import type { RecruitmentApprovalSubject } from "./recruitment-approval-link.repository";

const POLICY_KEY: Record<RecruitmentApprovalSubject, string> = {
  requisition: "recruitment_requisition_approval",
  offer: "recruitment_offer_approval",
};

@Injectable()
export class RecruitmentApprovalPolicyResolver {
  constructor(
    private readonly engineRepo: PlatformApprovalEngineRepository,
  ) {}

  async resolve(subjectType: RecruitmentApprovalSubject): Promise<string | null> {
    const policy = await this.engineRepo.findActivePolicyByKey(
      POLICY_KEY[subjectType],
    );
    return policy?.id ?? null;
  }
}
