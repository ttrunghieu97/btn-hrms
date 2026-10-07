export type AuditAction = 
  | 'permission.grant'
  | 'permission.revoke'
  | 'role.assign'
  | 'role.revoke'
  | 'employee.create'
  | 'employee.update'
  | 'employee.delete'
  | 'login.success'
  | 'login.failure'
  | 'approval.approve'
  | 'approval.reject'
  | 'contract.create'
  | 'contract.update'
  | 'system.config'
  | 'unknown';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEvent {
  id: string;
  action: AuditAction;
  actor?: { id: string; name: string };
  resource?: { type: string; id: string; label?: string };
  target?: string;
  severity: AuditSeverity;
  timestamp: string;
  requestId?: string;
  traceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuditQuery {
  actor?: string;
  action?: AuditAction;
  resourceType?: string;
  severity?: AuditSeverity;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}
