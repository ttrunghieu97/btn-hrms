/**
 * Canonical audit action identifiers for the Identity & Authorization domain.
 *
 * Naming convention: <RESOURCE>_<VERB> for success, <RESOURCE>_<VERB>_FAILED for failures.
 * All actions are stored as-is in the audit_logs.action column.
 */
export const IDENTITY_AUDIT_ACTIONS = {
  // ── Role lifecycle ─────────────────────────────────────────────────────────
  ROLE_CREATED:       'ROLE_CREATED',
  ROLE_UPDATED:       'ROLE_UPDATED',
  ROLE_DELETED:       'ROLE_DELETED',
  ROLE_CREATE_FAILED: 'ROLE_CREATE_FAILED',
  ROLE_UPDATE_FAILED: 'ROLE_UPDATE_FAILED',
  ROLE_DELETE_FAILED: 'ROLE_DELETE_FAILED',

  // ── Role ↔ Permission membership ───────────────────────────────────────────
  ROLE_PERMISSIONS_SET: 'ROLE_PERMISSIONS_SET',

  // ── User ↔ Role membership ─────────────────────────────────────────────────
  USER_ACCESS_UPDATED:       'USER_ACCESS_UPDATED',

  // ── Access grants (temporary permissions) ─────────────────────────────────
  ACCESS_GRANT_CREATED: 'ACCESS_GRANT_CREATED',
} as const;

export type IdentityAuditAction =
  (typeof IDENTITY_AUDIT_ACTIONS)[keyof typeof IDENTITY_AUDIT_ACTIONS];
