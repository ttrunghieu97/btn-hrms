/**
 * AuthUser — the resolved identity placed on request.user by JwtAuthGuard.
 */
export interface AuthUser {
  /** UUID of the users row */
  id: string;

  username: string;

  /** UUID of the linked employee row (optional — system users may not have one) */
  employeeId?: string;

  /** Canonical organization scope (single-tenant: constant value from env). */
  scopeId?: string | null;

  /** UUID of the employee's department (null for non-employees) */
  departmentId: string | null;

  /**
   * Effective flat permission set resolved at auth time.
   * Includes: direct user_permissions + role_permissions + inherited children.
   * "ALL" is the special super-admin sentinel.
   */
  permissions: string[];

  /**
   * Active role names for this request (used by audit log + policy engine).
   * Populated by JwtAuthGuard after loading user_roles.
   */
  roles: string[];

  isSuperAdmin?: boolean;

  avatar?: string | null;
}
