import { type PolicyHandler } from "./policy-handler.interface";
import { type AuthUser } from "../types/auth-user.interface";
export const ExpensesPolicies = {
  access: { policyName: "ExpensesAccess", handle(_user: AuthUser): boolean { return true; } },
} satisfies Record<string, PolicyHandler>;
