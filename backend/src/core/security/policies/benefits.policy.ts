import { type PolicyHandler } from "./policy-handler.interface";
import { type AuthUser } from "../types/auth-user.interface";

export const BenefitsPolicies = {
  access: {
    policyName: "BenefitsAccess",
    handle(_user: AuthUser): boolean { return true; },
  },
} satisfies Record<string, PolicyHandler>;
