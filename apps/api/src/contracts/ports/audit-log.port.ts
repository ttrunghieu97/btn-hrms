/** Result of the audited operation. Always present for identity/authorization events. */
export type AuditResult = 'SUCCESS' | 'FAILED';

export interface AuditLogEntry {
  /** User who performed the action. Omit for system-initiated events. */
  actorUserId?: string | null;

  /**
   * Namespaced action identifier in SCREAMING_SNAKE_CASE.
   * Convention: <RESOURCE>_<VERB> or <RESOURCE>_<VERB>_FAILED
   * e.g. ROLE_CREATED, ROLE_DELETE_FAILED, USER_ROLE_REPLACED
   */
  action: string;

  /**
   * Resource type being acted upon.
   * e.g. 'role', 'user', 'permission'
   * Mapped to `entity` column for backward compatibility.
   */
  entity: string;

  /** Primary identifier of the resource. Can be a UUID or a human-readable code. */
  entityId?: string | null;

  /** Whether the action succeeded or failed. */
  result?: AuditResult;

  /**
   * Machine-readable reason for the outcome (especially for FAILED results).
   * Maps to ERROR_CODES values e.g. 'ROLE_IN_USE', 'ROLE_SYSTEM_PROTECTED'.
   */
  reason?: string | null;

  /** Trace/request ID for correlating with HTTP request logs and trace spans. */
  traceId?: string | null;

  /** Structured JSON payload with before/after state or contextual details. */
  metadata?: unknown;
}

export interface AuditLogPort {
  write(entry: AuditLogEntry): Promise<void>;
}
