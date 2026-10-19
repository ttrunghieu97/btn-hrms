'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { workspaceApi } from '../api/workspace-api';
import type {
  ComplianceData,
  HrWorkspaceHeaderCounts,
  TodaySummary,
  WorkforceHealthData,
  WorkspaceAction,
  WorkspaceRole,
} from '../types';

interface HeadcountWidgetData {
  totalEmployees?: number;
  activeEmployees?: number;
  probationEmployees?: number;
  terminatedEmployees?: number;
}

interface HiresLeaversWidgetData {
  series?: Array<{ name: string; data: number[] }>;
}

interface ComplianceWidgetData {
  documentsExpiring?: number;
  contractsEnding?: number;
  missingProfiles?: number;
}

const workspaceKeys = createKeyFactory('workspace');

/**
 * Workspace data hook.
 *
 * Fetches live dashboard widgets and unified workflow tasks so the
 * HR Operations Workspace renders real-time headcount, compliance,
 * and pending workflow actions.
 */
export function useWorkspaceData() {
  const dashboardQuery = useQuery({
    queryKey: workspaceKeys.detail('dashboard-overview'),
    queryFn: ({ signal }) => workspaceApi.getDashboardOverview(signal),
    ...queryPolicyPresets.dashboard,
  });

  const workflowTasksQuery = useQuery({
    queryKey: workspaceKeys.detail('workflow-tasks'),
    queryFn: ({ signal }) => workspaceApi.getMyWorkflowTasks(signal),
    staleTime: 30_000,
  });

  const actions: WorkspaceAction[] = useMemo(() => {
    const tasks = workflowTasksQuery.data?.tasks ?? [];
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: [task.requesterName, task.subtitle].filter(Boolean).join(' • '),
      type: task.domain === 'offboarding' ? 'task' : 'approval',
      url: task.detailUrl,
      createdAt: task.createdAt ?? new Date().toISOString(),
      priority:
        task.priority === 'urgent'
          ? 'high'
          : task.priority === 'high'
            ? 'medium'
            : 'low',
    }));
  }, [workflowTasksQuery.data?.tasks]);

  const healthData: WorkforceHealthData | undefined = useMemo(() => {
    const widgets = dashboardQuery.data?.widgets;
    if (!widgets) return undefined;

    const headcountWidget = widgets.find((w) => w.id === 'headcount');
    const hiresLeaversWidget = widgets.find((w) => w.id === 'hires-vs-leavers');
    const headcount = (headcountWidget?.data ?? {}) as HeadcountWidgetData;
    const hiresLeavers = (hiresLeaversWidget?.data ?? {}) as HiresLeaversWidgetData;
    const hiresSeries = hiresLeavers.series?.find(
      (s) => s.name.toLowerCase() === 'hires',
    );
    const newThisMonth =
      hiresSeries && hiresSeries.data.length > 0
        ? (hiresSeries.data[hiresSeries.data.length - 1] ?? 0)
        : 0;

    return {
      total: headcount.totalEmployees ?? 0,
      active: headcount.activeEmployees ?? 0,
      probation: headcount.probationEmployees ?? 0,
      leaving: headcount.terminatedEmployees ?? 0,
      newThisMonth,
    };
  }, [dashboardQuery.data?.widgets]);

  const complianceData: ComplianceData | undefined = useMemo(() => {
    const widgets = dashboardQuery.data?.widgets;
    if (!widgets) return undefined;

    const complianceWidget = widgets.find((w) => w.id === 'compliance-status');
    const compliance = (complianceWidget?.data ?? {}) as ComplianceWidgetData;

    return {
      documentsExpiring: compliance.documentsExpiring ?? 0,
      contractsEnding: compliance.contractsEnding ?? 0,
      missingProfiles: compliance.missingProfiles ?? 0,
    };
  }, [dashboardQuery.data?.widgets]);

  const headerCounts: HrWorkspaceHeaderCounts = useMemo(() => {
    const countsByDomain = workflowTasksQuery.data?.countsByDomain ?? {};
    const pendingApprovals =
      workflowTasksQuery.data?.total ?? actions.length;
    const pendingOnboarding = countsByDomain['offboarding'] ?? 0;
    const expiringContracts = complianceData?.contractsEnding ?? 0;

    return {
      pendingOnboarding,
      pendingApprovals,
      expiringContracts,
    };
  }, [
    actions.length,
    complianceData?.contractsEnding,
    workflowTasksQuery.data?.countsByDomain,
    workflowTasksQuery.data?.total,
  ]);

  const summary: TodaySummary = useMemo(
    () => ({
      attendance: undefined,
      leaveBalance: undefined,
      pendingActionsCount: workflowTasksQuery.data?.total ?? actions.length,
      notificationsCount: 0,
    }),
    [actions.length, workflowTasksQuery.data?.total],
  );

  const isLoading = dashboardQuery.isLoading || workflowTasksQuery.isLoading;
  const error = (dashboardQuery.error ?? workflowTasksQuery.error ?? null) as Error | null;

  const refetch = useCallback(() => {
    void dashboardQuery.refetch();
    void workflowTasksQuery.refetch();
  }, [dashboardQuery, workflowTasksQuery]);

  return {
    summary,
    actions,
    healthData,
    complianceData,
    headerCounts,
    isLoading,
    error,
    refetch,
  };
}

export function useWorkspaceRole(): WorkspaceRole {
  const user = useAuthStore((s) => s.user);
  const roles = (user?.roles ?? []).map((r: unknown) =>
    typeof r === 'string'
      ? r.toLowerCase()
      : String((r as { name?: string } | null)?.name ?? '').toLowerCase(),
  );

  if (roles.some((r) => r.includes('admin'))) return 'admin';
  if (roles.some((r) => r.includes('hr') || r.includes('payroll'))) return 'hr';
  if (roles.some((r) => r.includes('manager'))) return 'manager';
  return 'employee';
}
