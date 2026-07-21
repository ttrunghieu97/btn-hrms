import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineService } from "@/modules/platform-approval-engine/platform-approval-engine.service";
import type { AssetApprovalSubject } from "./asset-approval-link.repository";

interface ApprovalRequestResult {
  id: string;
}

const SUBJECT_TYPE: Record<AssetApprovalSubject, string> = {
  request: "asset_request",
};

@Injectable()
export class AssetApprovalGateway {
  constructor(private readonly engine: PlatformApprovalEngineService) {}

  async requestApproval(input: {
    subjectType: AssetApprovalSubject;
    policyId: string;
    subjectId: string;
    requestedByUserId: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<ApprovalRequestResult> {
    return this.engine.requestApproval({
      policyId: input.policyId,
      subjectType: SUBJECT_TYPE[input.subjectType],
      subjectId: input.subjectId,
      requestedByUserId: input.requestedByUserId,
      metadata: { source: "asset-management", ...input.metadata },
    });
  }

  async cancelApproval(approvalRequestId: string): Promise<void> {
    return this.engine.cancelApproval(approvalRequestId);
  }
}

export { SUBJECT_TYPE as ASSET_SUBJECT_TYPES };
