import { Injectable } from "@nestjs/common";
import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "../policies/policy-handler.interface";
import { PermissionHierarchyResolver } from "../permissions/permission-hierarchy.resolver";
import { Permissions } from "../permissions/permissions.registry";
import {
  PolicyEvaluationContext,
  PolicyEvaluationResult,
} from "./policy-engine.types";

/**
 * PolicyEngine — the central authorization decision point.
 *
 * Resolution order (fail-fast, first match wins):
 *
 *   1. Super-admin bypass        → always ALLOW
 *   2. Permission check          → flat expanded permission set
 *   3. Policy handler            → domain-specific logic (ABAC, self-access, etc.)
 *   4. Default deny
 *
 * The engine is stateless beyond the injected resolver — all per-request
 * context comes via the evaluation context argument.
 */
@Injectable()
export class PolicyEngine {
  constructor(
    private readonly hierarchyResolver: PermissionHierarchyResolver,
  ) {}

  /**
   * Evaluate a list of policy handlers against the given context.
   *
   * All handlers must pass (AND semantics).  To get OR semantics, wrap
   * alternatives in a single composite handler.
   *
   * @param handlers - ordered list of policy handlers to run
   * @param ctx      - evaluation context (user, action, resource …)
   */
  async evaluate(
    handlers: PolicyHandler[],
    ctx: PolicyEvaluationContext,
  ): Promise<PolicyEvaluationResult> {
    const { user, resource } = ctx;

    // ── Stage 1: Super-admin bypass ─────────────────────────────────────────
    if (user.isSuperAdmin || user.permissions?.includes(Permissions.SYS_ALL)) {
      return {
        allowed: true,
        decidedBy: "super_admin",
        permissionsChecked: [],
      };
    }

    // ── Stage 2 & 3: Iterate handlers ───────────────────────────────────────
    for (const handler of handlers) {
      const requiredPerms = handler.requiredAnyOfPermissions ?? [];
      const permissionsChecked = [...requiredPerms];

      // Stage 2 — permission fast-path:
      // If the handler declares requiredAnyOfPermissions AND the user has none
      // of them (even after hierarchy expansion), DENY immediately.
      // This enforces AND semantics across handlers while avoiding expensive
      // DB-loaded resource checks for users who clearly lack the permission.
      if (requiredPerms.length > 0) {
        const hasAnyPermission = requiredPerms.some((p) =>
          this.hierarchyResolver.satisfies(user.permissions, p),
        );

        if (!hasAnyPermission) {
          const handlerName =
            handler.policyName ?? handler.constructor?.name ?? "UnknownPolicy";

          return {
            allowed: false,
            decidedBy: "policy_handler",
            policyUsed: handlerName,
            permissionsChecked,
            reason: `Missing required permissions for policy '${handlerName}'`,
          };
        }
      }

      // Stage 3 — policy handler (full ABAC evaluation):
      // The handler receives the full AuthUser (with expanded permissions)
      // and optionally the loaded resource for attribute-based conditions.
      const callHandle = handler.can ?? handler.handle.bind(handler);
      const passed = await callHandle(user, resource);

      if (!passed) {
        const handlerName =
          handler.policyName ?? handler.constructor?.name ?? "UnknownPolicy";

        return {
          allowed: false,
          decidedBy: "policy_handler",
          policyUsed: handlerName,
          permissionsChecked,
          reason: `Policy '${handlerName}' denied access`,
        };
      }

      // Handler passed — keep evaluating remaining handlers (AND chain)
    }

    if (handlers.length === 0) {
      // No handlers registered → route only requires authentication.
      return {
        allowed: true,
        decidedBy: "default_deny",
        permissionsChecked: [],
      };
    }

    // All handlers passed.
    return {
      allowed: true,
      decidedBy: "policy_handler",
      permissionsChecked: handlers.flatMap(
        (h) => h.requiredAnyOfPermissions ?? [],
      ),
    };
  }

  /**
   * Convenience helper — single permission check with hierarchy expansion.
   * Useful for imperative in-service checks (e.g. service-layer guards).
   *
   * Usage: policyEngine.can(user, "attendance:view:self")
   */
  can(user: AuthUser, permissionCode: string): boolean {
    if (user.isSuperAdmin || user.permissions?.includes(Permissions.SYS_ALL)) return true;
    return this.hierarchyResolver.satisfies(user.permissions, permissionCode);
  }
}
