import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import type { PolicyHandler } from "../../../core/security/policies/policy-handler.interface";
import { Permissions } from "../../../core/security/permissions/permissions.registry";

function hasGlobalAccess(user: AuthUser): boolean {
  return user.isSuperAdmin === true || user.permissions.includes(Permissions.SYS_ALL);
}

class ViewWorkflowDefinitionsPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewWorkflowDefinitions";
  readonly requiredAnyOfPermissions = [Permissions.WORKFLOW_DEFINITIONS_VIEW];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.WORKFLOW_DEFINITIONS_VIEW);
  }
}

class ViewWorkflowInstancesPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewWorkflowInstances";
  readonly requiredAnyOfPermissions = [Permissions.WORKFLOW_INSTANCES_VIEW];

  handle(user: AuthUser): boolean {
    return hasGlobalAccess(user) || user.permissions.includes(Permissions.WORKFLOW_INSTANCES_VIEW);
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

export const WorkflowPolicies = {
  viewDefinitions: new ViewWorkflowDefinitionsPolicyHandler(),
  viewInstances: new ViewWorkflowInstancesPolicyHandler(),
  startInstance: new StartWorkflowInstancePolicyHandler(),
  transitionInstance: new TransitionWorkflowInstancePolicyHandler(),
  cancelInstance: new CancelWorkflowInstancePolicyHandler(),
} as const;
