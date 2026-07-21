import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import type { PolicyHandler } from "../../../core/security/policies/policy-handler.interface";
import { Permissions } from "../../../core/security/permissions/permissions.registry";

function hasGlobalAccess(user: AuthUser): boolean {
  return user.isSuperAdmin === true || user.permissions.includes(Permissions.SYS_ALL);
}

class ViewApprovalPoliciesPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewApprovalPolicies";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_POLICIES_VIEW];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_POLICIES_VIEW);
  }
}

class CreateApprovalPolicyPolicyHandler implements PolicyHandler {
  readonly policyName = "CreateApprovalPolicy";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_POLICIES_CREATE];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_POLICIES_CREATE);
  }
}

class UpdateApprovalPolicyPolicyHandler implements PolicyHandler {
  readonly policyName = "UpdateApprovalPolicy";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_POLICIES_EDIT];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_POLICIES_EDIT);
  }
}

class DeleteApprovalPolicyPolicyHandler implements PolicyHandler {
  readonly policyName = "DeleteApprovalPolicy";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_POLICIES_DELETE];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_POLICIES_DELETE);
  }
}

class ViewApprovalRequestsPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewApprovalRequests";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_REQUESTS_VIEW];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_REQUESTS_VIEW);
  }
}

class RequestApprovalPolicyHandler implements PolicyHandler {
  readonly policyName = "RequestApproval";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_REQUESTS_CREATE];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_REQUESTS_CREATE);
  }
}

class DecideApprovalStepPolicyHandler implements PolicyHandler {
  readonly policyName = "DecideApprovalStep";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_REQUESTS_DECIDE];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_REQUESTS_DECIDE);
  }
}

class CancelApprovalRequestPolicyHandler implements PolicyHandler {
  readonly policyName = "CancelApprovalRequest";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_REQUESTS_CANCEL];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_REQUESTS_CANCEL);
  }
}

class ViewApprovalInboxPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewApprovalInbox";
  readonly requiredAnyOfPermissions = [Permissions.APPROVAL_INBOX_VIEW];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.APPROVAL_INBOX_VIEW);
  }
}

export const ApprovalPolicies = {
  viewPolicies: new ViewApprovalPoliciesPolicyHandler(),
  createPolicy: new CreateApprovalPolicyPolicyHandler(),
  updatePolicy: new UpdateApprovalPolicyPolicyHandler(),
  deletePolicy: new DeleteApprovalPolicyPolicyHandler(),
  viewRequests: new ViewApprovalRequestsPolicyHandler(),
  request: new RequestApprovalPolicyHandler(),
  decide: new DecideApprovalStepPolicyHandler(),
  cancel: new CancelApprovalRequestPolicyHandler(),
  inbox: new ViewApprovalInboxPolicyHandler(),
} as const;
