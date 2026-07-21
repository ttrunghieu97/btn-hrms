import { type PolicyHandler } from "./policy-handler.interface";
import { type AuthUser } from "../types/auth-user.interface";
export const LearningPolicies = {
  access: { policyName: "LearningAccess", handle(_user: AuthUser): boolean { return true; } },
} satisfies Record<string, PolicyHandler>;
