import { Injectable } from "@nestjs/common";
import { PolicyEngine } from "./policy-engine/policy.engine";
import { AuthUser } from "./types/auth-user.interface";
import { PolicyEvaluationResult } from "./policy-engine/policy-engine.types";

@Injectable()
export class AuthorizationService {
  constructor(private readonly policyEngine: PolicyEngine) {}

  /**
   * Evaluates if a user is authorized for a given action on a resource.
   * This is the central entrypoint for all manual authorization checks in services.
   */
  async authorize(
    user: AuthUser,
    action: string,
    _meta?: {
      resource?: any;
      resourceType?: string;
      resourceId?: string;
    },
  ): Promise<PolicyEvaluationResult> {
    const allowed = this.policyEngine.can(user, action);

    return {
      allowed,
      decidedBy: allowed ? "permission_check" : "default_deny",
      permissionsChecked: [action],
      reason: allowed ? undefined : `User lacks required permission: ${action}`,
    };
  }

  /**
   * Fast-path check for a specific permission code.
   */
  can(user: AuthUser, permissionCode: string): boolean {
    return this.policyEngine.can(user, permissionCode);
  }
}
