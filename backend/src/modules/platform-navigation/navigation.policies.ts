import { type AuthUser } from "../../core/security/types/auth-user.interface";
import { type PolicyHandler } from "../../core/security/policies/policy-handler.interface";

/**
 * Any authenticated user can view navigation.
 * Actual item filtering is done server-side by NavService based on permissions.
 */
class ViewNavPolicyHandler implements PolicyHandler {
  async handle(user: AuthUser): Promise<boolean> {
    return !!user;
  }

  can = this.handle.bind(this);
}

export const navPolicies = {
  view: new ViewNavPolicyHandler(),
} satisfies Record<string, PolicyHandler>;
