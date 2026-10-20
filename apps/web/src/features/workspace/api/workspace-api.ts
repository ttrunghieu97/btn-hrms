import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import type { TodaySummary } from '../types';

export interface WorkspaceDashboardWidgetDto<TData = unknown> {
  id: string;
  title: string;
  type: string;
  category: string;
  data: TData;
}

export interface WorkspaceDashboardEnvelope {
  widgets: WorkspaceDashboardWidgetDto[];
}

export interface WorkspaceTaskItemDto {
  id: string;
  workflowId: string;
  domain: string;
  domainLabel: string;
  entityId: string;
  title: string;
  subtitle: string;
  requesterName: string;
  currentState: string;
  currentStateLabel: string;
  priority: 'urgent' | 'high' | 'normal';
  createdAt?: string;
  detailUrl: string;
}

export interface WorkspaceTasksResponseDto {
  tasks: WorkspaceTaskItemDto[];
  total: number;
  countsByDomain: Record<string, number>;
}

/**
 * Workspace data adapter.
 *
 * Fetches dashboard widget aggregates and unified workflow tasks directly
 * via the shared API fetcher without pulling heavy UI feature barrels.
 */
export const workspaceApi = {
  async getDashboardOverview(signal?: AbortSignal): Promise<WorkspaceDashboardEnvelope> {
    const res = await customFetch<WorkspaceDashboardEnvelope>('/api/v1/dashboard', {
      signal,
    });
    return unwrapData<WorkspaceDashboardEnvelope>(res);
  },

  async getMyWorkflowTasks(signal?: AbortSignal): Promise<WorkspaceTasksResponseDto> {
    const res = await customFetch<WorkspaceTasksResponseDto>('/api/v1/workflow/tasks/my', {
      signal,
    });
    return unwrapData<WorkspaceTasksResponseDto>(res);
  },

  async getTodaySummary(signal?: AbortSignal): Promise<TodaySummary> {
    const tasks = await this.getMyWorkflowTasks(signal);
    return {
      attendance: undefined,
      leaveBalance: undefined,
      pendingActionsCount: tasks.total ?? tasks.tasks.length,
      notificationsCount: 0,
    };
  },
};
