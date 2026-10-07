import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineService } from "@/modules/platform-approval-engine/platform-approval-engine.service";
import type { RecruitmentApprovalSubject } from "./recruitment-approval-link.repository";

interface ApprovalRequestResult {
  id: string;
}

const SUBJECT_TYPE: Record<RecruitmentApprovalSubject, string> = {
  requisition: "recruitment_requisition",
  offer: "recruitment_offer",
};

@Injectable()
export class RecruitmentApprovalGateway {
  constructor(private readonly engine: PlatformApprovalEngineService) {}

  async requestApproval(input: {
    subjectType: RecruitmentApprovalSubject;
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
      metadata: { source: "recruitment", ...input.metadata },
    });
  }

  async cancelApproval(approvalRequestId: string): Promise<void> {
    return this.engine.cancelApproval(approvalRequestId);
  }
}

export { SUBJECT_TYPE as RECRUITMENT_SUBJECT_TYPES };
