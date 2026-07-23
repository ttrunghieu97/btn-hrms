import type { RecruitmentApprovalSubject } from "./recruitment-approval-link.repository";

export const RECRUITMENT_SUBJECT_TYPES: Record<RecruitmentApprovalSubject, string> = {
  requisition: "recruitment_requisition",
  offer: "recruitment_offer",
};
