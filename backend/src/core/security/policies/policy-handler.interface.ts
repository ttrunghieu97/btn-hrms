import { type AuthUser } from "../types/auth-user.interface";

/**
 * PolicyHandler — the unit of authorization logic.
 *
 * Each handler implements one discrete access rule (e.g. "can view employee").
 * The engine calls handle() after permission checks have been resolved.
 *
 * The `can` alias is the new preferred method name; `handle` is kept for
 * backward compatibility with existing handlers.
 */
export interface PolicyHandler {
  /**
   * Evaluate the policy.
   *
   * @param user     - the authenticated caller (with expanded permissions)
   * @param resource - the loaded domain resource (null when not applicable)
   * @returns true  → access granted
   *          false → access denied
   */
  handle(user: AuthUser, resource?: unknown): boolean | Promise<boolean>;

  /**
   * Convenience alias — identical semantics to handle().
   * New policies should implement this; old ones are adapted automatically.
   */
  can?: (user: AuthUser, resource?: unknown) => boolean | Promise<boolean>;

  /**
   * Hint to guards/clients: at least one of these permission codes is needed.
   * Used for error reporting and @RequirePermission fast-path.
   */
  requiredAnyOfPermissions?: string[];

  /** Human-readable name shown in audit logs */
  policyName?: string;
}
