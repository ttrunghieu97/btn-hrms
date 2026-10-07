'use client';

import { useMemo } from 'react';
import {
  HrWorkspaceHeader,
  WorkforceHealth,
  HrActionCenter,
  ComplianceStatus,
  PendingActions,
} from '@/features/workspace';
import { useWorkspaceData } from '@/features/workspace';

/**
 * HR Operations Workspace — role-specific view.
 * Route: /workspace/hr
 * Access: hr, hr_manager, payroll roles
 */
export default function HrWorkspacePage() {
  const { summary, actions, isLoading } = useWorkspaceData();

  // Placeholder data — wire to real queries when available
  const healthData = useMemo(() => ({
    total: 1248,
    active: 1102,
    probation: 86,
    leaving: 12,
    newThisMonth: 24,
  }), []);

  const complianceData = useMemo(() => ({
    documentsExpiring: 12,
    contractsEnding: 5,
    missingProfiles: 8,
  }), []);

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-6 px-4">
      {/* HR header with attention summary */}
      <HrWorkspaceHeader
        pendingOnboarding={5}
        pendingApprovals={3}
        expiringContracts={2}
      />

      {/* Workforce health metrics */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Workforce Health</h2>
        <WorkforceHealth data={healthData} />
      </section>

      {/* Lifecycle attention */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PendingActions actions={actions} isLoading={isLoading} />

        {/* Compliance */}
        <ComplianceStatus data={complianceData} />
      </div>

      {/* HR actions */}
      <section className="space-y-3">
        <HrActionCenter />
      </section>
    </div>
  );
}
