import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "@/modules/platform-approval-engine/repositories/platform-approval-engine.repository";
import type { AssetApprovalSubject } from "./asset-approval-link.repository";

const POLICY_KEY: Record<AssetApprovalSubject, string> = {
  request: "asset_request_approval",
};

@Injectable()
export class AssetApprovalPolicyResolver {
  constructor(private readonly engineRepo: PlatformApprovalEngineRepository) {}

  async resolve(subjectType: AssetApprovalSubject): Promise<string | null> {
    const policy = await this.engineRepo.findActivePolicyByKey(
      POLICY_KEY[subjectType],
    );
    return policy?.id ?? null;
  }
}
