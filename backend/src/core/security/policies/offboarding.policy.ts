import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

class ViewOffboardingPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewOffboarding";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_VIEW,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.OFFBOARDING_VIEW) ?? false;
  }
}

class EditOffboardingPolicyHandler implements PolicyHandler {
  readonly policyName = "EditOffboarding";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_EDIT,
    Permissions.OFFBOARDING_CREATE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.OFFBOARDING_EDIT) ||
      user.permissions?.includes(Permissions.OFFBOARDING_CREATE)
    ) ?? false;
  }
}

class DeleteOffboardingPolicyHandler implements PolicyHandler {
  readonly policyName = "DeleteOffboarding";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_DELETE,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return user.permissions?.includes(Permissions.OFFBOARDING_DELETE) ?? false;
  }
}

class ClearanceITPolicyHandler implements PolicyHandler {
  readonly policyName = "ClearanceIT";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_CLEARANCE_IT,
    Permissions.OFFBOARDING_EDIT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.OFFBOARDING_CLEARANCE_IT) ||
      user.permissions?.includes(Permissions.OFFBOARDING_EDIT)
    ) ?? false;
  }
}

class ClearanceHRPolicyHandler implements PolicyHandler {
  readonly policyName = "ClearanceHR";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_CLEARANCE_HR,
    Permissions.OFFBOARDING_EDIT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.OFFBOARDING_CLEARANCE_HR) ||
      user.permissions?.includes(Permissions.OFFBOARDING_EDIT)
    ) ?? false;
  }
}

class ClearanceFinancePolicyHandler implements PolicyHandler {
  readonly policyName = "ClearanceFinance";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_CLEARANCE_FINANCE,
    Permissions.OFFBOARDING_EDIT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.OFFBOARDING_CLEARANCE_FINANCE) ||
      user.permissions?.includes(Permissions.OFFBOARDING_EDIT)
    ) ?? false;
  }
}

class ClearanceManagerPolicyHandler implements PolicyHandler {
  readonly policyName = "ClearanceManager";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_CLEARANCE_MANAGER,
    Permissions.OFFBOARDING_EDIT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.OFFBOARDING_CLEARANCE_MANAGER) ||
      user.permissions?.includes(Permissions.OFFBOARDING_EDIT)
    ) ?? false;
  }
}

class ClearanceSecurityPolicyHandler implements PolicyHandler {
  readonly policyName = "ClearanceSecurity";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_CLEARANCE_SECURITY,
    Permissions.OFFBOARDING_EDIT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.OFFBOARDING_CLEARANCE_SECURITY) ||
      user.permissions?.includes(Permissions.OFFBOARDING_EDIT)
    ) ?? false;
  }
}

class ExitInterviewPolicyHandler implements PolicyHandler {
  readonly policyName = "OffboardingExitInterview";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_EXIT_INTERVIEW,
    Permissions.OFFBOARDING_EDIT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.OFFBOARDING_EXIT_INTERVIEW) ||
      user.permissions?.includes(Permissions.OFFBOARDING_EDIT)
    ) ?? false;
  }
}

class CompleteOffboardingPolicyHandler implements PolicyHandler {
  readonly policyName = "CompleteOffboarding";
  readonly requiredAnyOfPermissions = [
    Permissions.OFFBOARDING_COMPLETE,
    Permissions.OFFBOARDING_EDIT,
  ];
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
    return (
      user.permissions?.includes(Permissions.OFFBOARDING_COMPLETE) ||
      user.permissions?.includes(Permissions.OFFBOARDING_EDIT)
    ) ?? false;
  }
}

export const OffboardingPolicies = {
  view: new ViewOffboardingPolicyHandler(),
  edit: new EditOffboardingPolicyHandler(),
  delete: new DeleteOffboardingPolicyHandler(),
  clearanceIT: new ClearanceITPolicyHandler(),
  clearanceHR: new ClearanceHRPolicyHandler(),
  clearanceFinance: new ClearanceFinancePolicyHandler(),
  clearanceManager: new ClearanceManagerPolicyHandler(),
  clearanceSecurity: new ClearanceSecurityPolicyHandler(),
  exitInterview: new ExitInterviewPolicyHandler(),
  complete: new CompleteOffboardingPolicyHandler(),
};
