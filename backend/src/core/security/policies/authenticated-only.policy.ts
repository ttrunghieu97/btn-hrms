import type { AuthUser } from "../types/auth-user.interface";
import type { PolicyHandler } from "./policy-handler.interface";

export class AuthenticatedOnlyPolicyHandler implements PolicyHandler {
  readonly policyName = "AuthenticatedOnly";

  handle(user: AuthUser): boolean {
    return Boolean(user?.id);
  }
}

export const AuthenticatedOnlyPolicy = new AuthenticatedOnlyPolicyHandler();
