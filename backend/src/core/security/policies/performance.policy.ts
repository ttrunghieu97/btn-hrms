import { type PolicyHandler } from "./policy-handler.interface";
import { type AuthUser } from "../types/auth-user.interface";

export const PerformancePolicies = {
  access: {
    policyName: "PerformanceAccess",
    handle(_user: AuthUser): boolean {
      return true;
    },
  } satisfies PolicyHandler,
};
