import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../../infrastructure/database/schema";

/**
 * Cross-context port for identity admin operations.
 *
 * Workforce (and any other bounded context that owns a user-facing aggregate
 * linked 1:1 to `users`) injects this port to revoke sessions and permanently
 * remove a user. Use-cases MUST NOT touch the `users` table or
 * `AuthRepository` directly — go through this port.
 *
 * Deleting a user cascades to `employees` (employees.user_id → users.id is
 * `onDelete: "cascade"`), then to every table whose FK targets
 * `employees.id` (also all `onDelete: "cascade"` in this codebase).
 */
export type IdentityDb = PostgresJsDatabase<typeof schema>;

export interface CreateUserInput {
  username: string;
  email: string | null;
  passwordHash: string;
  isSuperAdmin: boolean;
  passwordResetTokenHash?: string | null;
  passwordResetTokenExpiresAt?: Date | null;
  mustChangePassword?: boolean;
  isActive?: boolean;
}

export interface IdentityAdminPort {
  /**
   * Create a user in the identity context. Called by other bounded contexts
   * (workforce, onboarding) that own aggregates linked 1:1 to `users`.
   *
   * The caller owns the transaction — this port method accepts an optional
   * `tx` to participate in the caller's transaction boundary. When `tx` is
   * omitted, the adapter manages its own DB session.
   */
  createUser(input: CreateUserInput, tx: IdentityDb): Promise<{ id: string }>;

  /**
   * Revoke every active refresh token for a user. Idempotent.
   * Returns the number of tokens revoked.
   */
  revokeSessions(userId: string, tx: IdentityDb): Promise<number>;

  /**
   * Hard-delete a user. Cascades to employees + every employee-owned table.
   * Will fail with an FK error if the user is referenced by a `restrict`
   * constraint (e.g. permission_grants.approvedByUserId,
   * access_grants.createdByUserId) — caller must clean those first.
   */
  deleteUser(userId: string, tx: IdentityDb): Promise<void>;

  /**
   * Mark a user as inactive (`isActive = false`) and revoke all live
   * refresh-token sessions. Used when an employee is auto-terminated
   * via `endDate < today` so login can be rejected even on the same day
   * the date is set. Idempotent. No-op if user is already inactive.
   */
  deactivateUser(userId: string, tx: IdentityDb): Promise<void>;

  /**
   * Re-enable a previously deactivated user. Used when an employee is
   * re-hired / restored and `endDate` is cleared or moved to the future.
   * Idempotent. No-op if user is already active.
   */
  reactivateUser(userId: string, tx: IdentityDb): Promise<void>;
}
