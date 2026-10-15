'use client';

import { useMemo, useState } from 'react';
import {
  AuditTimelineView,
  AuditFilters,
  AuditSummaryCards,
  useAuditLogsQuery,
  type AuditFilterValues,
} from '@/features/audit';
import type { AuditLogsControllerFindAllParams } from '@/api/generated/model';

function periodToFromIso(period?: string): string | undefined {
  const now = Date.now();
  switch (period) {
    case '24h':
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return undefined;
  }
}

export default function AdminAuditPage() {
  const [filters, setFilters] = useState<AuditFilterValues>({ period: '7d' });

  const queryParams = useMemo<AuditLogsControllerFindAllParams>(() => {
    const from = periodToFromIso(filters.period);
    return {
      limit: 100,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entity ? { entity: filters.entity } : {}),
      ...(from ? { from } : {}),
    };
  }, [filters]);

  const { data: allEvents = [], isLoading } = useAuditLogsQuery(queryParams);

  const filteredEvents = useMemo(() => {
    if (!filters.severity) return allEvents;
    return allEvents.filter((e) => e.severity === filters.severity);
  }, [allEvents, filters.severity]);

  const summaryData = useMemo(() => {
    const failedLogins = allEvents.filter(
      (e) => e.action.includes('login') && e.severity === 'critical',
    ).length;
    const permissionChanges = allEvents.filter((e) =>
      e.action.includes('permission'),
    ).length;
    const roleAssignments = allEvents.filter((e) =>
      e.action.includes('role'),
    ).length;
    const policyUpdates = allEvents.filter(
      (e) => e.action.includes('policy') || e.action.includes('approval'),
    ).length;

    return {
      failedLogins,
      permissionChanges,
      roleAssignments,
      policyUpdates,
    };
  }, [allEvents]);

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-6 px-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Security events, permission changes, and system activity audit trail.
        </p>
      </div>

      {/* Summary cards */}
      <AuditSummaryCards data={summaryData} isLoading={isLoading} />

      {/* Filters */}
      <AuditFilters onFilter={setFilters} />

      {/* Timeline */}
      <AuditTimelineView events={filteredEvents} isLoading={isLoading} />
    </div>
  );
}
