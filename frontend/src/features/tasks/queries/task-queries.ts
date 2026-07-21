/**
 * Task TanStack Query hooks built on the orval-generated fetchers.
 * Uses the 'fast-changing' query policy from `@/lib/query-client`.
 *
 * Mutations that change task state pass an `Idempotency-Key` header
 * (built via `utils/idempotency.ts`) so callers can safely retry on
 * transient failures without producing duplicate transitions.
 */

import {
  queryOptions,
  useMutation,
  useQuery,
  type QueryClient,
  type UseQueryResult
} from '@tanstack/react-query';
import {
  tasksControllerAccept,
  tasksControllerAddDependency,
  tasksControllerApprove,
  tasksControllerBulkAssign,
  tasksControllerCreate,
  tasksControllerCreateComment,
  tasksControllerGetAnalytics,
  tasksControllerGetAssigneePerformanceReport,
  tasksControllerList,
  tasksControllerListActivities,
  tasksControllerListAssignments,
  tasksControllerListAttachments,
  tasksControllerListComments,
  tasksControllerListDependencies,
  tasksControllerListMine,
  tasksControllerListSubmissions,
  tasksControllerListTransitions,
  tasksControllerReject,
  tasksControllerRemove,
  tasksControllerRemoveAttachment,
  tasksControllerRemoveComment,
  tasksControllerRemoveDependency,
  tasksControllerFindById,
  tasksControllerListSubtasks,
  tasksControllerReturnTask,
  tasksControllerSubmit,
  tasksControllerTransitionTask,
  tasksControllerUpdate,
  tasksControllerUploadAttachment,
  taskTemplatesControllerCreate,
  taskTemplatesControllerFindAll,
  taskTemplatesControllerInstantiate
} from '../../../api/generated/endpoints';
import type {
  AddTaskDependencyDto,
  BulkAssignTaskDto,
  CreateTaskCommentDto,
  CreateTaskDto,
  CreateTaskTemplateDto,
  RejectTaskDto,
  ReturnTaskDto,
  SubmitTaskDto,
  TaskResponseDto,
  TasksControllerGetAnalyticsParams,
  TasksControllerGetAssigneePerformanceReportParams,
  TasksControllerListMineParams,
  TasksControllerListParams,
  TransitionTaskDto,
  UpdateTaskDto
} from '../../../api/generated/model';
import type { Task } from '../utils/task-types';
import { extractList, extractPagination, unwrapData } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { buildIdempotencyHeaders } from '../utils/idempotency';

/* ------------------------------------------------------------------ */
/* Query keys (factory + custom extensions)                            */
/* ------------------------------------------------------------------ */

export const taskKeys = {
  ...createKeyFactory<
    TasksControllerListParams | { scope?: string }
  >('tasks'),
  mine: (params?: TasksControllerListMineParams) =>
    ['tasks', 'list', 'mine', params] as const,
  assignments: (id: string) => ['tasks', 'assignments', id] as const,
  activities: (id: string) => ['tasks', 'activities', id] as const,
  comments: (id: string) => ['tasks', 'comments', id] as const,
  attachments: (id: string) => ['tasks', 'attachments', id] as const,
  submissions: (id: string) => ['tasks', 'submissions', id] as const,
  dependencies: (id: string) => ['tasks', 'dependencies', id] as const,
  transitions: (id: string) => ['tasks', 'transitions', id] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  subtasks: (id: string) => ['tasks', 'subtasks', id] as const,
  analytics: (params?: TasksControllerGetAnalyticsParams) =>
    ['tasks', 'analytics', params] as const,
  performance: (
    params?: TasksControllerGetAssigneePerformanceReportParams
  ) => ['tasks', 'performance', params] as const,
  templates: () => ['tasks', 'templates'] as const,
};

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function useTasksQuery(params: TasksControllerListParams = {}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: ({ signal }) => tasksControllerList(params, { signal }),
    select: (data) => ({
      tasks: extractList(data),
      pagination: extractPagination(data),
      raw: data
    }),
    ...queryPolicyPresets['fast-changing']
  });
}

export function useMyTasksQuery(params: TasksControllerListMineParams = {}) {
  return useQuery({
    queryKey: taskKeys.mine(params),
    queryFn: ({ signal }) => tasksControllerListMine(params, { signal }),
    select: (data) => ({
      tasks: extractList(data),
      pagination: extractPagination(data),
      raw: data
    }),
    ...queryPolicyPresets['fast-changing']
  });
}

export function useTaskAssignmentsQuery(taskId: string) {
  return useQuery({
    queryKey: taskKeys.assignments(taskId),
    queryFn: ({ signal }) => tasksControllerListAssignments(taskId, { signal }),
    enabled: Boolean(taskId),
    select: (data) => extractList(data)
  });
}

export function useTaskActivitiesQuery(taskId: string) {
  return useQuery({
    queryKey: taskKeys.activities(taskId),
    queryFn: ({ signal }) => tasksControllerListActivities(taskId, { signal }),
    enabled: Boolean(taskId),
    select: (data) => extractList(data)
  });
}

export function useTaskCommentsQuery(taskId: string) {
  return useQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: ({ signal }) => tasksControllerListComments(taskId, { signal }),
    enabled: Boolean(taskId),
    select: (data) => extractList(data)
  });
}

export function useTaskByIdQuery(taskId: string): UseQueryResult<Task, Error> {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: ({ signal }) => tasksControllerFindById(taskId, { signal }),
    enabled: Boolean(taskId),
    select: (data) => unwrapData(data) as unknown as Task
  });
}

export function useSubtasksQuery(parentTaskId: string): UseQueryResult<Task[], Error> {
  return useQuery({
    queryKey: taskKeys.subtasks(parentTaskId),
    queryFn: ({ signal }) => tasksControllerListSubtasks(parentTaskId, { signal }),
    enabled: Boolean(parentTaskId),
    select: (data) => extractList(data) as unknown as Task[]
  });
}

export function useTaskAttachmentsQuery(taskId: string) {
  return useQuery({
    queryKey: taskKeys.attachments(taskId),
    queryFn: ({ signal }) =>
      tasksControllerListAttachments(taskId, { signal }),
    enabled: Boolean(taskId),
    select: (data) => extractList(data)
  });
}

export function useTaskSubmissionsQuery(taskId: string) {
  return useQuery({
    queryKey: taskKeys.submissions(taskId),
    queryFn: ({ signal }) =>
      tasksControllerListSubmissions(taskId, { signal }),
    enabled: Boolean(taskId),
    select: (data) => extractList(data)
  });
}

export function useTaskDependenciesQuery(taskId: string) {
  return useQuery({
    queryKey: taskKeys.dependencies(taskId),
    queryFn: ({ signal }) =>
      tasksControllerListDependencies(taskId, { signal }),
    enabled: Boolean(taskId),
    select: (data) => extractList(data)
  });
}

export function useTaskTransitionsQuery(taskId: string) {
  return useQuery({
    queryKey: taskKeys.transitions(taskId),
    queryFn: ({ signal }) =>
      tasksControllerListTransitions(taskId, { signal }),
    enabled: Boolean(taskId),
    select: (data) => unwrapData(data)
  });
}

export function useTaskAnalyticsQuery(
  params: TasksControllerGetAnalyticsParams = {}
) {
  return useQuery({
    queryKey: taskKeys.analytics(params),
    queryFn: ({ signal }) =>
      tasksControllerGetAnalytics(params, { signal }),
    select: (data) => unwrapData(data),
    ...queryPolicyPresets['fast-changing']
  });
}

export function useTaskPerformanceQuery(
  params: TasksControllerGetAssigneePerformanceReportParams = {}
) {
  return useQuery({
    queryKey: taskKeys.performance(params),
    queryFn: ({ signal }) =>
      tasksControllerGetAssigneePerformanceReport(params, { signal }),
    select: (data) => unwrapData(data),
    ...queryPolicyPresets['fast-changing']
  });
}

export function useTaskTemplatesQuery() {
  return useQuery({
    queryKey: taskKeys.templates(),
    queryFn: ({ signal }) => taskTemplatesControllerFindAll({ signal }),
    select: (data) => extractList(data),
    ...queryPolicyPresets['static']
  });
}

/* ------------------------------------------------------------------ */
/* SSR query options                                                   */
/* ------------------------------------------------------------------ */

export interface TasksListData {
  tasks: TaskResponseDto[];
  totalTasks: number;
}

export const tasksQueryOptions = (
  params: TasksControllerListParams = {},
  requestInit?: RequestInit
) =>
  queryOptions({
    queryKey: taskKeys.list(params),
    queryFn: async (): Promise<TasksListData> => {
      const response = await tasksControllerList(params, requestInit);
      const tasks = extractList<TaskResponseDto>(response);
      const pagination = extractPagination(response);
      return {
        tasks,
        totalTasks: pagination?.total ?? tasks.length
      };
    },
    ...queryPolicyPresets['fast-changing']
  });

export const myTasksQueryOptions = (
  params: TasksControllerListMineParams = {},
  requestInit?: RequestInit
) =>
  queryOptions({
    queryKey: taskKeys.mine(params),
    queryFn: async (): Promise<TasksListData> => {
      const response = await tasksControllerListMine(params, requestInit);
      const tasks = extractList<TaskResponseDto>(response);
      const pagination = extractPagination(response);
      return {
        tasks,
        totalTasks: pagination?.total ?? tasks.length
      };
    },
    ...queryPolicyPresets['fast-changing']
  });

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

const idem = (): RequestInit => ({
  headers: buildIdempotencyHeaders() as unknown as HeadersInit
});

export function useCreateTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (data: CreateTaskDto) => tasksControllerCreate(data),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  });
}

export function useUpdateTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; patch: UpdateTaskDto }) =>
      tasksControllerUpdate(vars.id, vars.patch),
    onSettled: async (_d, _e, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.activities(vars.id) })
      ]);
    }
  });
}

export function useRemoveTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (id: string) => tasksControllerRemove(id),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  });
}

export function useAcceptTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (id: string) => tasksControllerAccept(id, idem()),
    onSettled: async (_d, _e, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.activities(id) })
      ]);
    }
  });
}

export function useRejectTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; data: RejectTaskDto }) =>
      tasksControllerReject(vars.id, vars.data, idem()),
    onSettled: async (_d, _e, vars) => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.activities(vars.id)
      });
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  });
}

export function useSubmitTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; data: SubmitTaskDto }) =>
      tasksControllerSubmit(vars.id, vars.data, idem()),
    onSettled: async (_d, _e, vars) => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.activities(vars.id)
      });
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  });
}

export function useApproveTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (id: string) => tasksControllerApprove(id, idem()),
    onSettled: async (_d, _e, id) => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.activities(id) });
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  });
}

export function useReturnTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; data: ReturnTaskDto }) =>
      tasksControllerReturnTask(vars.id, vars.data, idem()),
    onSettled: async (_d, _e, vars) => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.activities(vars.id)
      });
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  });
}

export function useTransitionTaskMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; data: TransitionTaskDto }) =>
      tasksControllerTransitionTask(vars.id, vars.data, idem()),
    onSettled: async (_d, _e, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.activities(vars.id) }),
        queryClient.invalidateQueries({ queryKey: taskKeys.transitions(vars.id) })
      ]);
    }
  });
}

export function useAddCommentMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; data: CreateTaskCommentDto }) =>
      tasksControllerCreateComment(vars.id, vars.data),
    onSettled: async (_d, _e, vars) => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.comments(vars.id)
      });
    }
  });
}

export function useRemoveCommentMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; commentId: string }) =>
      tasksControllerRemoveComment(vars.id, vars.commentId),
    onSettled: async (_d, _e, vars) => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.comments(vars.id)
      });
    }
  });
}

export function useUploadAttachmentMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: async (vars: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', vars.file);
      return tasksControllerUploadAttachment(vars.id, { body: formData });
    },
    onSettled: async (_d, _e, vars) => {
      if (vars) {
        await queryClient.invalidateQueries({
          queryKey: taskKeys.attachments(vars.id)
        });
      }
    }
  });
}

export function useRemoveAttachmentMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; attachmentId: string }) =>
      tasksControllerRemoveAttachment(vars.id, vars.attachmentId),
    onSettled: async (_d, _e, vars) => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.attachments(vars.id)
      });
    }
  });
}

export function useAddDependencyMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; data: AddTaskDependencyDto }) =>
      tasksControllerAddDependency(vars.id, vars.data),
    onSettled: async (_d, _e, vars) => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.dependencies(vars.id)
      });
    }
  });
}

export function useRemoveDependencyMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string; dependsOnTaskId: string }) =>
      tasksControllerRemoveDependency(vars.id, vars.dependsOnTaskId),
    onSettled: async (_d, _e, vars) => {
      await queryClient.invalidateQueries({
        queryKey: taskKeys.dependencies(vars.id)
      });
    }
  });
}

export function useBulkAssignMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (data: BulkAssignTaskDto) => tasksControllerBulkAssign(data),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  });
}

export function useCreateTaskTemplateMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (data: CreateTaskTemplateDto) =>
      taskTemplatesControllerCreate(data),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
    }
  });
}

export function useInstantiateTaskTemplateMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (vars: { id: string }) =>
      taskTemplatesControllerInstantiate(vars.id),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  });
}
