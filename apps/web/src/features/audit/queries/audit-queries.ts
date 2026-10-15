import { useQuery } from '@tanstack/react-query';
import { auditLogsControllerFindAll } from '@/api/generated/audit-logs/audit-logs';
import type { AuditLogsControllerFindAllParams } from '@/api/generated/model';
import { extractList } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import type { AuditEvent, AuditSeverity } from '../types';

export type RawAuditLog = {
  id: string;
  actorUserId?: string | null;
  actor?: {
    id: string;
    username: string;
    email?: string | null;
  } | null;
  action: string;
  entity: string;
  entityId?: string | null;
  result?: 'SUCCESS' | 'FAILED' | null;
  reason?: string | null;
  traceId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export const auditLogKeys = createKeyFactory<AuditLogsControllerFindAllParams>('audit-logs');

function deriveSeverity(raw: RawAuditLog): AuditSeverity {
  if (raw.result === 'FAILED' || raw.action.includes('failure') || raw.action.includes('denied')) {
    return 'critical';
  }
  if (
    raw.action.includes('permission') ||
    raw.action.includes('role') ||
    raw.action.includes('delete') ||
    raw.action.includes('terminate') ||
    raw.action.includes('revoke')
  ) {
    return 'warning';
  }
  return 'info';
}

export function mapAuditLogToEvent(raw: RawAuditLog): AuditEvent {
  const meta =
    raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : undefined;
  const before =
    meta && typeof meta.before === 'object' && meta.before !== null
      ? (meta.before as Record<string, unknown>)
      : undefined;
  const after =
    meta && typeof meta.after === 'object' && meta.after !== null
      ? (meta.after as Record<string, unknown>)
      : undefined;

  return {
    id: raw.id,
    action: raw.action,
    ...(raw.actor
      ? { actor: { id: raw.actor.id, name: raw.actor.username || raw.actor.email || raw.actor.id } }
      : raw.actorUserId
        ? { actor: { id: raw.actorUserId, name: raw.actorUserId.slice(0, 8) } }
        : {}),
    ...(raw.entity
      ? {
          resource: {
            type: raw.entity,
            id: raw.entityId ?? '—',
          },
        }
      : {}),
    ...(raw.reason ? { target: raw.reason } : {}),
    severity: deriveSeverity(raw),
    timestamp: raw.createdAt,
    ...(raw.traceId ? { requestId: raw.traceId, traceId: raw.traceId } : {}),
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    ...(meta ? { metadata: meta } : {}),
  };
}

export function useAuditLogsQuery(params?: AuditLogsControllerFindAllParams) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: ({ signal }) => auditLogsControllerFindAll(params, { signal }),
    select: (data) => extractList<RawAuditLog>(data).map(mapAuditLogToEvent),
    ...queryPolicyPresets['fast-changing'],
  });
}
