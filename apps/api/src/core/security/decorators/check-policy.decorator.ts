import { SetMetadata } from "@nestjs/common";
import { type PolicyHandler } from "../policies/policy-handler.interface";

export const CHECK_POLICY_KEY = "check_policy";

/**
 * Attach one or more PolicyHandler instances to a route.
 * All handlers must pass (AND semantics).
 *
 * @example
 * @CheckPolicy(EmployeePolicies.view)
 * @CheckPolicy(EmployeePolicies.view, EmployeePolicies.edit)
 */
export const CheckPolicy = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICY_KEY, handlers);
