import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import type { PolicyHandler } from "../../../core/security/policies/policy-handler.interface";
import { Permissions } from "../../../core/security/permissions/permissions.registry";

function hasGlobalAccess(user: AuthUser): boolean {
  return Boolean(user?.isSuperAdmin === true || user?.permissions?.includes(Permissions.SYS_ALL));
}

function hasPerm(user: AuthUser, perm: string): boolean {
  const perms = user?.permissions;
  if (!perms) return false;
  if (perms.includes(perm)) return true;
  if (perm.startsWith("employee:")) {
    return perms.includes(`employees:${perm.slice("employee:".length)}`);
  }
  return false;
}

export const EMPLOYEE_WORKFLOW_SUBJECT_TYPES = ["employee", "employee_transfer"] as const;

export function hasGlobalWorkflowViewAccess(user: AuthUser): boolean {
  return hasGlobalAccess(user) || Boolean(user?.permissions?.includes(Permissions.WORKFLOW_INSTANCES_VIEW));
}

class ViewWorkflowDefinitionsPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewWorkflowDefinitions";
  readonly requiredAnyOfPermissions = [Permissions.WORKFLOW_DEFINITIONS_VIEW];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || Boolean(user?.permissions?.includes(Permissions.WORKFLOW_DEFINITIONS_VIEW));
  }
}

class ViewWorkflowInstancesPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewWorkflowInstances";
  readonly requiredAnyOfPermissions = [
    Permissions.WORKFLOW_INSTANCES_VIEW,
    Permissions.EMPLOYEES_EDIT,
    Permissions.EMPLOYEES_UPDATE_ALL,
    Permissions.EMPLOYEES_MANAGE,
    Permissions.EMPLOYEES_MANAGE_SENSITIVE,
    Permissions.APPROVAL_REQUESTS_DECIDE,
  ];

  handle(user: AuthUser): boolean {
    return (
      hasGlobalWorkflowViewAccess(user) ||
      this.requiredAnyOfPermissions.some((perm) => hasPerm(user, perm))
    );
  }
}

class StartWorkflowInstancePolicyHandler implements PolicyHandler {
  readonly policyName = "StartWorkflowInstance";
  readonly requiredAnyOfPermissions = [Permissions.WORKFLOW_INSTANCES_START];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.WORKFLOW_INSTANCES_START);
  }
}

class TransitionWorkflowInstancePolicyHandler implements PolicyHandler {
  readonly policyName = "TransitionWorkflowInstance";
  readonly requiredAnyOfPermissions = [Permissions.WORKFLOW_INSTANCES_TRANSITION];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.WORKFLOW_INSTANCES_TRANSITION);
  }
}

class CancelWorkflowInstancePolicyHandler implements PolicyHandler {
  readonly policyName = "CancelWorkflowInstance";
  readonly requiredAnyOfPermissions = [Permissions.WORKFLOW_INSTANCES_CANCEL];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.WORKFLOW_INSTANCES_CANCEL);
  }
}

class ViewWorkflowTasksPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewWorkflowTasks";
  readonly requiredAnyOfPermissions = [];

  handle(user: AuthUser): boolean {
    return Boolean(user?.id);
  }
}

export const WorkflowPolicies = {
  viewDefinitions: new ViewWorkflowDefinitionsPolicyHandler(),
  viewInstances: new ViewWorkflowInstancesPolicyHandler(),
  viewTasks: new ViewWorkflowTasksPolicyHandler(),
  startInstance: new StartWorkflowInstancePolicyHandler(),
  transitionInstance: new TransitionWorkflowInstancePolicyHandler(),
  cancelInstance: new CancelWorkflowInstancePolicyHandler(),
} as const;

