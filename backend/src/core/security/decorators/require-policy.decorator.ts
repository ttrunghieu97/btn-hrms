import { SetMetadata } from "@nestjs/common";
import { type PolicyDomain } from "../policies/policy.registry";

export const REQUIRE_POLICY_KEY = "require_policy";

export interface RequirePolicyMeta {
  domain: PolicyDomain;
  action: string;
}

/**
 * Declarative policy reference by domain + action name.
 * The AuthorizationGuard resolves the handler from PolicyRegistry at runtime.
 *
 * @example
 * @RequirePolicy("Attendance", "report")
 * @RequirePolicy("Employee", "edit")
 */
export const RequirePolicy = (domain: PolicyDomain, action: string) =>
  SetMetadata(REQUIRE_POLICY_KEY, {
    domain,
    action,
  } satisfies RequirePolicyMeta);
