'use client';

import { useMemo } from 'react';
import {
  AuditTimelineView,
  AuditFilters,
  AuditSummaryCards,
} from '@/features/audit';
import type { AuditEvent } from '@/features/audit';

const mockAuditEvents: AuditEvent[] = [
  { id: 'ae-1', action: 'permission.grant', actor: { id: 'u-1', name: 'Admin User' }, resource: { type: 'permission', id: 'p-1', label: 'payroll:view' }, target: 'role:hr_manager', severity: 'warning', timestamp: new Date(Date.now() - 900000).toISOString(), requestId: 'req-a1b2c3' },
  { id: 'ae-2', action: 'login.failure', actor: { id: 'u-3', name: 'unknown' }, severity: 'critical', timestamp: new Date(Date.now() - 1800000).toISOString(), requestId: 'req-d4e5f6' },
  { id: 'ae-3', action: 'employee.update', actor: { id: 'u-2', name: 'HR Manager' }, resource: { type: 'employee', id: 'emp-0123', label: 'Nguyen Van A' }, severity: 'info', timestamp: new Date(Date.now() - 3600000).toISOString(), before: { salary_grade: 'G5' }, after: { salary_grade: 'G6' } },
  { id: 'ae-4', action: 'role.assign', actor: { id: 'u-1', name: 'Admin User' }, resource: { type: 'role', id: 'r-2', label: 'Manager' }, target: 'user:u-4', severity: 'info', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'ae-5', action: 'approval.approve', actor: { id: 'u-5', name: 'Director' }, resource: { type: 'leave', id: 'lv-42', label: 'Annual Leave' }, severity: 'info', timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: 'ae-6', action: 'permission.revoke', actor: { id: 'u-1', name: 'Admin User' }, resource: { type: 'permission', id: 'p-3', label: 'attendance:manage' }, target: 'role:intern', severity: 'warning', timestamp: new Date(Date.now() - 28800000).toISOString() },
  { id: 'ae-7', action: 'login.success', actor: { id: 'u-6', name: 'Employee' }, severity: 'info', timestamp: new Date(Date.now() - 43200000).toISOString() },
  { id: 'ae-8', action: 'contract.create', actor: { id: 'u-2', name: 'HR Manager' }, resource: { type: 'contract', id: 'ct-101', label: 'Probation Contract' }, severity: 'info', timestamp: new Date(Date.now() - 86400000).toISOString() },
];

export default function AdminAuditPage() {
  const summaryData = useMemo(() => ({
    failedLogins: 24,
    permissionChanges: 8,
    roleAssignments: 15,
    policyUpdates: 3,
  }), []);

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
      <AuditSummaryCards data={summaryData} />

      {/* Filters */}
      <AuditFilters onFilter={() => {}} />

      {/* Timeline */}
      <AuditTimelineView events={mockAuditEvents} />
    </div>
  );
}
