import { type AuthUser } from "../types/auth-user.interface";

export interface PolicyEvaluationContext {
  user: AuthUser;
  action: string;
  resource?: unknown;
  resourceType?: string;
  resourceId?: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  /** Which stage made the final decision */
  decidedBy:
    | "super_admin"
    | "permission_check"
    | "policy_handler"
    | "resource_condition"
    | "default_deny";
  /** Name of the policy handler used (if any) */
  policyUsed?: string;
  /** Permission codes that were evaluated */
  permissionsChecked: string[];
  /** Denial reason ? for audit log and debug */
  reason?: string;
}
