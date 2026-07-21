import { SetMetadata } from "@nestjs/common";

export const REQUIRE_PERMISSION_KEY = "require_permission";

/**
 * Shorthand for simple permission-only checks without a full policy handler.
 * The AuthorizationGuard will evaluate this via PolicyEngine.can() with
 * hierarchy expansion.
 *
 * @example
 * @RequirePermission("employees:view")
 * @RequirePermission("attendance:view:self")   // also satisfied by :department or :all
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
