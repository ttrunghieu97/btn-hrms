'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  HrWorkspaceHeader,
  WorkforceHealth,
  HrActionCenter,
  ComplianceStatus,
  PendingActions,
  useWorkspaceData,
} from '@/features/workspace';

/**
 * HR Operations Workspace — role-specific view.
 * Route: /workspace/hr
 * Access: hr, hr_manager, payroll roles
 */
export default function HrWorkspacePage() {
  const {
    actions,
    healthData,
    complianceData,
    headerCounts,
    isLoading,
    error,
    refetch,
  } = useWorkspaceData();

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-6 px-4">
      {/* HR header with live attention summary */}
      <HrWorkspaceHeader
        pendingOnboarding={headerCounts.pendingOnboarding}
        pendingApprovals={headerCounts.pendingApprovals}
        expiringContracts={headerCounts.expiringContracts}
      />

      {error && (
        <Card role="alert" className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Unable to load workspace metrics
              </p>
              <p className="text-xs text-muted-foreground">
                {error.message || 'An unexpected error occurred while fetching HR workspace data.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Workforce health metrics */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Workforce Health</h2>
        <WorkforceHealth data={healthData} isLoading={isLoading} />
      </section>

      {/* Lifecycle attention & compliance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PendingActions actions={actions} isLoading={isLoading} />
        <ComplianceStatus data={complianceData} isLoading={isLoading} />
      </div>

      {/* HR actions */}
      <section className="space-y-3">
        <HrActionCenter />
      </section>
    </div>
  );
}
