import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./base.policy";
import { Permissions } from "../permissions/permissions.registry";

function hasAny(user: AuthUser, ...perms: string[]): boolean {
  if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
  const granted = user.permissions ?? [];
  return perms.some((p) => granted.includes(p));
}

class ViewRecruitmentPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.RECRUITMENT_VIEW];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.RECRUITMENT_VIEW);
  }
}

class ManageRequisitionPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.RECRUITMENT_REQUISITION_MANAGE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.RECRUITMENT_REQUISITION_MANAGE);
  }
}

class ApproveRequisitionPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.RECRUITMENT_REQUISITION_APPROVE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.RECRUITMENT_REQUISITION_APPROVE);
  }
}

class ManagePostingPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.RECRUITMENT_POSTING_MANAGE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.RECRUITMENT_POSTING_MANAGE);
  }
}

class ManageCandidatePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.RECRUITMENT_CANDIDATE_MANAGE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.RECRUITMENT_CANDIDATE_MANAGE);
  }
}

class ManagePipelinePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.RECRUITMENT_PIPELINE_MANAGE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.RECRUITMENT_PIPELINE_MANAGE);
  }
}

class ManageOfferPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.RECRUITMENT_OFFER_MANAGE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.RECRUITMENT_OFFER_MANAGE);
  }
}

export const RecruitmentPolicies = {
  view: new ViewRecruitmentPolicyHandler(),
  manageRequisition: new ManageRequisitionPolicyHandler(),
  approveRequisition: new ApproveRequisitionPolicyHandler(),
  managePosting: new ManagePostingPolicyHandler(),
  manageCandidate: new ManageCandidatePolicyHandler(),
  managePipeline: new ManagePipelinePolicyHandler(),
  manageOffer: new ManageOfferPolicyHandler(),
};
