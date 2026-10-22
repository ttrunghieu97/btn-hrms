/**
 * Employee TanStack Query hooks built on the orval-generated fetchers.
 *
 * Optimistic update pattern (set/prepend/remove + rollback) is ported
 * carefully from legacy `features/employees/queries/employee-queries.ts`.
 * The pattern is preserved verbatim in spirit:
 *   - cancel inflight queries for affected keys
 *   - snapshot all matching list caches + the detail cache
 *   - apply patch synchronously
 *   - rollback on error from the snapshot
 *   - invalidate on settle
 */

import { getRequestId } from '@/lib/request-id';

import {
  useMutation,
  useQuery,
  type QueryClient,
  type UseMutationOptions
} from '@tanstack/react-query';
import { departmentsControllerFindAll } from '@/api/generated/department-management/department-management';
import {
  employeeAdminControllerCheckEmployeeCode,
  employeeAdminControllerCheckUsernameAvailability,
  employeeAdminControllerPurge,
  employeeAdminControllerRemove,
  employeeAdminControllerResetPassword,
  employeeAdminControllerRestore
} from '@/api/generated/employee-admin/employee-admin';
import {
  employeesControllerCreate,
  employeesControllerFindAll,
  employeesControllerFindOne,
  employeesControllerGetMyProfile,
  employeesControllerUpdate
} from '@/api/generated/employees-hr-management/employees-hr-management';
import { positionsControllerFindAll } from '@/api/generated/positions/positions';
import type {
  EmployeeResponseDto,
  EmployeesControllerFindAllParams,
  PositionListItemDto,
} from '@/api/generated/model';
import {
  extractList,
  extractPagination,
  unwrapData,
  type PaginationMeta
} from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { customFetch } from '@/lib/fetcher';
import type { EmployeeAttachmentIntentPayload } from '../types/employee-attachment-payload';
import { fetchEmployeeTimeline, type TimelineEventDto, type TimelineQueryParams } from '../api/timeline';
import { contractKeys } from '../api/contract-queries';

import {
  applyEmployeeTransfer,
  bulkArchiveEmployees,
  bulkChangeEmployeeStatus,
  cancelEmployeeTransfer,
  cancelScheduledTermination,
  evaluateEmployeeProbation,
  fetchEmployeeBoardingStatus,
  fetchEmployeeWorkflowInstances,
  getEmployeeStatusHistory,
  hrApproveTransfer,
  managerApproveTransfer,
  rehireEmployee,
  rejectEmployeeTransfer,
  requestEmployeeTransfer,
  scheduleEmployeeTermination,
  type BulkOperationResponse,
  type EmployeeBoardingSummary,
  type EmployeeWorkflowInstanceItem,
  type EvaluateProbationPayload,
  type EvaluateProbationResponse,
  type RehireEmployeeRequest,
  type RehireEmployeeResponse,
  type RequestTransferPayload,
  type RequestTransferResponse,
  type ScheduleTerminationRequest,
  type ScheduleTerminationResponse,
} from '../api/employee-lifecycle';

export type Employee = EmployeeResponseDto;
export type EmployeeListParams = EmployeesControllerFindAllParams;
export type Position = PositionListItemDto;
export interface UpdateEmployeePayload extends EmployeeAttachmentIntentPayload {
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  email?: string | null;
  phoneNumber?: string;
  address?: string;
  dob?: string;
  gender?: string;
  departmentId?: string;
  position?: string;
  positionId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  identityNumber?: string;
  identityDate?: string;
  identityPlace?: string;
  bankName?: string;
  bankAccountNumber?: string;
  taxCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parentDepartmentId?: string | null;
}

export const employeeKeys = {
  ...createKeyFactory<EmployeeListParams>('employees'),
  me: () => ['employees', 'me'] as const,
  statusHistory: (id: string) => ['employees', id, 'status-history'] as const,
  workflowInstances: (id: string) => ['employees', id, 'workflow-instances'] as const,
  boardingStatus: (id: string) => ['employees', id, 'boarding-status'] as const,
};

export const departmentKeys = createKeyFactory('departments');
const positionKeys = createKeyFactory('positions');
export type TimelineKeyParams = { employeeId: string; types?: string; limit?: number };
export const timelineKeys = createKeyFactory<TimelineKeyParams>('employee-timeline');

export interface EmployeeListResult {
  employees: Employee[];
  pagination?: PaginationMeta;
  raw: unknown;
}

function isEmployeeListResult(value: unknown): value is EmployeeListResult {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as EmployeeListResult).employees)
  );
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */


export function useEmployeeQuery(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: ({ signal }) => employeesControllerFindOne(id, {}, { signal }),
    select: (data) => unwrapData<Employee>(data),
    enabled: Boolean(id),
    ...queryPolicyPresets['employees']
  });
}

export function useMyEmployeeProfileQuery() {
  return useQuery({
    queryKey: employeeKeys.me(),
    queryFn: ({ signal }) => employeesControllerGetMyProfile({ signal }),
    select: (data) => unwrapData<Employee>(data),
    ...queryPolicyPresets['static']
  });
}

export function useDepartmentsQuery(enabled = true) {
  return useQuery({
    queryKey: departmentKeys.list(),
    queryFn: async ({ signal }) => {
      const res = await departmentsControllerFindAll(undefined, { signal });
      return extractList<Department>(res);
    },
    enabled,
    select: (data) => data.toSorted((a, b) => a.name.localeCompare(b.name, 'vi')),
    ...queryPolicyPresets['static']
  });
}

export function usePositionsQuery(enabled = true) {
  return useQuery({
    queryKey: positionKeys.list(),
    queryFn: async ({ signal }) => {
      const res = await positionsControllerFindAll(undefined, { signal });
      return extractList<Position>(res);
    },
    enabled,
    select: (data) => data.toSorted((a, b) => a.name.localeCompare(b.name, 'vi')),
    ...queryPolicyPresets['static']
  });
}

export function useEmployeeTimelineQuery(employeeId: string, params?: TimelineQueryParams) {
  return useQuery<TimelineEventDto[], Error>({
    queryKey: timelineKeys.list({ employeeId, ...params }),
    queryFn: () =>
      fetchEmployeeTimeline(employeeId, params),
    enabled: Boolean(employeeId),
    ...queryPolicyPresets['employees'],
  });
}

/* ------------------------------------------------------------------ */
/* Optimistic helpers                                                  */
/* ------------------------------------------------------------------ */

interface MutationContext {
  previousLists: Array<[readonly unknown[], EmployeeListResult | undefined]>;
  previousDetail?: unknown;
}

function applyEmployeePatch(
  target: Employee,
  patch: Partial<Employee>
): Employee {
  return { ...target, ...patch };
}

function applyDetailCachePatch(
  cached: unknown,
  patch: Partial<Employee>
): unknown {
  if (!cached || typeof cached !== 'object') return cached;
  if (
    'data' in cached &&
    cached.data &&
    typeof cached.data === 'object' &&
    !Array.isArray(cached.data)
  ) {
    const env = cached as { data: unknown };
    if (
      'data' in (env.data as Record<string, unknown>) &&
      (env.data as { data?: unknown }).data &&
      typeof (env.data as { data?: unknown }).data === 'object'
    ) {
      const inner = env.data as { data: Employee };
      return {
        ...cached,
        data: {
          ...inner,
          data: applyEmployeePatch(inner.data, patch)
        }
      };
    }
    return {
      ...cached,
      data: applyEmployeePatch(env.data as Employee, patch)
    };
  }
  return applyEmployeePatch(cached as Employee, patch);
}

function setListEmployeeOptimistically(
  queryClient: QueryClient,
  employeeId: string,
  updater: (employee: Employee) => Employee
): void {
  const entries = queryClient.getQueriesData<EmployeeListResult>({
    queryKey: employeeKeys.lists()
  });
  for (const [key, cached] of entries) {
    if (!isEmployeeListResult(cached)) continue;
    let changed = false;
    const next = cached.employees.map((employee) => {
      const entityId = employee.id || employee.username;
      if (entityId !== employeeId) return employee;
      changed = true;
      return updater(employee);
    });
    if (!changed) continue;
    queryClient.setQueryData<EmployeeListResult>(key, {
      ...cached,
      employees: next
    });
  }
}

function prependListEmployeeOptimistically(
  queryClient: QueryClient,
  optimistic: Employee
): void {
  const entries = queryClient.getQueriesData<EmployeeListResult>({
    queryKey: employeeKeys.lists()
  });
  for (const [key, cached] of entries) {
    if (!isEmployeeListResult(cached)) continue;
    const exists = cached.employees.some(
      (e) => (e.id || e.username) === (optimistic.id || optimistic.username)
    );
    if (exists) continue;
    queryClient.setQueryData<EmployeeListResult>(key, {
      ...cached,
      employees: [optimistic, ...cached.employees]
    });
  }
}

function removeListEmployeeOptimistically(
  queryClient: QueryClient,
  employeeId: string
): void {
  const entries = queryClient.getQueriesData<EmployeeListResult>({
    queryKey: employeeKeys.lists()
  });
  for (const [key, cached] of entries) {
    if (!isEmployeeListResult(cached)) continue;
    const next = cached.employees.filter(
      (e) => (e.id || e.username) !== employeeId
    );
    if (next.length === cached.employees.length) continue;
    queryClient.setQueryData<EmployeeListResult>(key, {
      ...cached,
      employees: next
    });
  }
}

function toOptimisticPatch(data: UpdateEmployeePayload): Partial<Employee> {
  const { avatar, documents, certifications, ...rest } = data;
  return rest as Partial<Employee>;
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export function useCreateEmployeeMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<Employee, Error, UpdateEmployeePayload, MutationContext>
) {
  return useMutation<Employee, Error, UpdateEmployeePayload, MutationContext>({
    mutationFn: async (data) => {
      const response = await employeesControllerCreate(buildEmployeeUpdateRequestBody(data));
      return unwrapData<Employee>(response);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: employeeKeys.lists() });
      const previousLists = queryClient.getQueriesData<EmployeeListResult>({
        queryKey: employeeKeys.lists()
      });
      const patch = toOptimisticPatch(data);
      if (patch.firstName || patch.lastName || patch.email) {
        const optimistic: Employee = {
          id: `optimistic:${getRequestId()}`,
          username: patch.email ?? 'pending',
          email: patch.email ?? '',
          firstName: patch.firstName ?? '',
          lastName: patch.lastName ?? '',
          employeeCode: null,
          avatar: null,
          dob: null,
          gender: null,
          address: null,
          phoneNumber: patch.phoneNumber ?? null,
          position: null,
          startDate: null,
          endDate: null,
          lastWorkingDate: null,
          status: null,
          contractType: null,
          contractStatus: null,
          contractEffectiveFrom: null,
          contractEffectiveTo: null,
          identityNumber: null,
          identityDate: null,
          identityPlace: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          bankAccountNumber: null,
          bankName: null,
          taxCode: null,
          department: null,
          allowedTransitions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        prependListEmployeeOptimistically(queryClient, optimistic);
      }
      return { previousLists };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      for (const [key, snap] of ctx.previousLists) {
        queryClient.setQueryData(key, snap);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
    ...options
  });
}

export interface UpdateEmployeeVars {
  id: string;
  data: UpdateEmployeePayload;
}


function normalizeDateForApi(value: string | undefined) {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isoDateMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoDateMatch) return isoDateMatch[0];

  const ddMmYyyyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setPayloadValue(
  payload: Record<string, unknown>,
  key: string,
  value: string | undefined | null
) {
  if (value === undefined || value === null) return;
  payload[key] = value;
}

export function buildEmployeeUpdateRequestBody(data: UpdateEmployeePayload) {
  const payload: Record<string, unknown> = {};

  setPayloadValue(payload, 'username', data.username);
  setPayloadValue(payload, 'password', data.password);
  setPayloadValue(payload, 'firstName', data.firstName);
  setPayloadValue(payload, 'lastName', data.lastName);
  setPayloadValue(payload, 'employeeCode', data.employeeCode);
  setPayloadValue(payload, 'email', data.email);
  setPayloadValue(payload, 'phoneNumber', data.phoneNumber);
  setPayloadValue(payload, 'address', data.address);
  setPayloadValue(payload, 'dob', normalizeDateForApi(data.dob));
  setPayloadValue(payload, 'gender', data.gender);
  setPayloadValue(payload, 'departmentId', data.departmentId);
  setPayloadValue(payload, 'position', data.position);
  setPayloadValue(payload, 'positionId', data.positionId);
  setPayloadValue(payload, 'startDate', normalizeDateForApi(data.startDate));
  setPayloadValue(payload, 'endDate', normalizeDateForApi(data.endDate));
  setPayloadValue(payload, 'status', data.status);
  setPayloadValue(payload, 'identityNumber', data.identityNumber);
  setPayloadValue(payload, 'identityDate', normalizeDateForApi(data.identityDate));
  setPayloadValue(payload, 'identityPlace', data.identityPlace);
  setPayloadValue(payload, 'bankName', data.bankName);
  setPayloadValue(payload, 'bankAccountNumber', data.bankAccountNumber);
  setPayloadValue(payload, 'taxCode', data.taxCode);
  setPayloadValue(payload, 'emergencyContactName', data.emergencyContactName);
  setPayloadValue(payload, 'emergencyContactPhone', data.emergencyContactPhone);

  if (data.avatar !== undefined) {
    payload.avatar = data.avatar;
  }

  if (data.documents !== undefined) {
    payload.documents = data.documents;
  }

  if (data.certifications !== undefined) {
    payload.certifications = data.certifications.map((certification) => ({
      ...certification,
      ...(certification.issuedDate
        ? { issuedDate: normalizeDateForApi(certification.issuedDate) ?? certification.issuedDate }
        : {}),
      ...(certification.expiredDate
        ? { expiredDate: normalizeDateForApi(certification.expiredDate) ?? certification.expiredDate }
        : {})
    }));
  }

  return payload;
}

export async function checkEmployeeUsernameAvailability(username: string) {
  const normalized = username.trim();
  if (!normalized) return { exists: false };

  const response = await employeeAdminControllerCheckUsernameAvailability({
    username: normalized
  });

  return unwrapData<{ exists: boolean }>(response);
}

export async function checkEmployeeCodeAvailability(employeeCode: string) {
  const normalized = employeeCode.trim();
  if (!normalized) return { exists: false };

  const response = await employeeAdminControllerCheckEmployeeCode({
    employeeCode: normalized
  });

  return unwrapData<{ exists: boolean }>(response);
}

export function useUpdateEmployeeMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<Employee, Error, UpdateEmployeeVars, MutationContext>
) {
  return useMutation<Employee, Error, UpdateEmployeeVars, MutationContext>({
    mutationFn: async ({ id, data }) => {
      const response = await employeesControllerUpdate(id, buildEmployeeUpdateRequestBody(data));
      return unwrapData<Employee>(response);
    },
    onMutate: async ({ id, data }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: employeeKeys.lists() }),
        queryClient.cancelQueries({ queryKey: employeeKeys.detail(id) })
      ]);
      const previousLists = queryClient.getQueriesData<EmployeeListResult>({
        queryKey: employeeKeys.lists()
      });
      const previousDetail = queryClient.getQueryData(
        employeeKeys.detail(id)
      );
      const patch = toOptimisticPatch(data);
      if (previousDetail) {
        queryClient.setQueryData(
          employeeKeys.detail(id),
          applyDetailCachePatch(previousDetail, patch)
        );
      }
      setListEmployeeOptimistically(queryClient, id, (e) =>
        applyEmployeePatch(e, patch)
      );
      return { previousLists, previousDetail };
    },
    onError: (_err, vars, ctx) => {
      if (!ctx) return;
      for (const [key, snap] of ctx.previousLists) {
        queryClient.setQueryData(key, snap);
      }
      if (ctx.previousDetail) {
        queryClient.setQueryData(employeeKeys.detail(vars.id), ctx.previousDetail);
      }
    },
    onSettled: async (_d, _e, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(vars.id) }),
        queryClient.invalidateQueries({ queryKey: contractKeys.current(vars.id) }),
        queryClient.invalidateQueries({ queryKey: contractKeys.history(vars.id) }),
      ]);
    },
    ...options
  });
}


export function useRemoveEmployeeMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<unknown, Error, string, MutationContext>
) {
  return useMutation<unknown, Error, string, MutationContext>({
    mutationFn: (id) => employeeAdminControllerRemove(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: employeeKeys.lists() }),
        queryClient.cancelQueries({ queryKey: employeeKeys.detail(id) })
      ]);
      const previousLists = queryClient.getQueriesData<EmployeeListResult>({
        queryKey: employeeKeys.lists()
      });
      const previousDetail = queryClient.getQueryData<Employee>(
        employeeKeys.detail(id)
      );
      removeListEmployeeOptimistically(queryClient, id);
      queryClient.removeQueries({ queryKey: employeeKeys.detail(id) });
      return { previousLists, previousDetail };
    },
    onError: (_err, id, ctx) => {
      if (!ctx) return;
      for (const [key, snap] of ctx.previousLists) {
        queryClient.setQueryData(key, snap);
      }
      if (ctx.previousDetail) {
        queryClient.setQueryData(employeeKeys.detail(id), ctx.previousDetail);
      }
    },
    onSettled: async (_d, _e, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      ]);
    },
    ...options
  });
}

export function useRestoreEmployeeMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<unknown, Error, string, MutationContext>
) {
  return useMutation<unknown, Error, string, MutationContext>({
    mutationFn: (id) => employeeAdminControllerRestore(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: employeeKeys.lists() }),
        queryClient.cancelQueries({ queryKey: employeeKeys.detail(id) })
      ]);
      const previousLists = queryClient.getQueriesData<EmployeeListResult>({
        queryKey: employeeKeys.lists()
      });
      const previousDetail = queryClient.getQueryData<Employee>(
        employeeKeys.detail(id)
      );

      // Optimistic: remove from deleted list, potentially it will reappear in active list on invalidation
      removeListEmployeeOptimistically(queryClient, id);

      return { previousLists, previousDetail };
    },
    onError: (_err, id, ctx) => {
      if (!ctx) return;
      for (const [key, snap] of ctx.previousLists) {
        queryClient.setQueryData(key, snap);
      }
      if (ctx.previousDetail) {
        queryClient.setQueryData(employeeKeys.detail(id), ctx.previousDetail);
      }
    },
    onSettled: async (_d, _e, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      ]);
    },
    ...options
  });
}

export function usePurgeEmployeeMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<unknown, Error, string, MutationContext>
) {
  return useMutation<unknown, Error, string, MutationContext>({
    mutationFn: (id) => employeeAdminControllerPurge(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: employeeKeys.lists() }),
        queryClient.cancelQueries({ queryKey: employeeKeys.detail(id) })
      ]);
      const previousLists = queryClient.getQueriesData<EmployeeListResult>({
        queryKey: employeeKeys.lists()
      });
      const previousDetail = queryClient.getQueryData<Employee>(
        employeeKeys.detail(id)
      );

      removeListEmployeeOptimistically(queryClient, id);
      queryClient.removeQueries({ queryKey: employeeKeys.detail(id) });

      return { previousLists, previousDetail };
    },
    onError: (_err, id, ctx) => {
      if (!ctx) return;
      for (const [key, snap] of ctx.previousLists) {
        queryClient.setQueryData(key, snap);
      }
      if (ctx.previousDetail) {
        queryClient.setQueryData(employeeKeys.detail(id), ctx.previousDetail);
      }
    },
    onSettled: async (_d, _e, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      ]);
    },
    ...options
  });
}

export function useBulkRemoveEmployeesMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<BulkOperationResponse, Error, string[]>
) {
  return useMutation<BulkOperationResponse, Error, string[]>({
    mutationFn: async (ids) => {
      return bulkArchiveEmployees(ids);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
    ...options
  });
}

export interface BulkChangeStatusVariables {
  employeeIds: string[];
  status: 'working' | 'probation' | 'leave' | 'suspended' | 'retired';
  effectiveDate?: string;
  reason?: string;
}

export function useBulkChangeStatusMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<BulkOperationResponse, Error, BulkChangeStatusVariables>
) {
  return useMutation<BulkOperationResponse, Error, BulkChangeStatusVariables>({
    mutationFn: async (payload) => {
      return bulkChangeEmployeeStatus(payload);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
    ...options
  });
}

export function useResetEmployeePasswordMutation(
  options?: UseMutationOptions<
    { success: boolean; username: string; password: null; temporaryPasswordIssued: boolean; resetRequired: boolean },
    Error,
    string
  >
) {
  return useMutation<
    { success: boolean; username: string; password: null; temporaryPasswordIssued: boolean; resetRequired: boolean },
    Error,
    string
  >({
    mutationFn: async (id) => {
      const response = await employeeAdminControllerResetPassword(id);
      return unwrapData<{ success: boolean; username: string; password: null; temporaryPasswordIssued: boolean; resetRequired: boolean }>(response);
    },
    ...options
  });
}

/* ------------------------------------------------------------------ */
/* Employee Status History, Workflows & Boarding Queries              */
/* ------------------------------------------------------------------ */

export function useEmployeeStatusHistoryQuery(id: string) {
  return useQuery({
    queryKey: employeeKeys.statusHistory(id),
    queryFn: () => getEmployeeStatusHistory(id),
    enabled: Boolean(id),
    ...queryPolicyPresets['employees'],
  });
}

export function useEmployeeWorkflowInstancesQuery(id: string, enabled = true) {
  return useQuery<EmployeeWorkflowInstanceItem[], Error>({
    queryKey: employeeKeys.workflowInstances(id),
    queryFn: () => fetchEmployeeWorkflowInstances(id),
    enabled: Boolean(id) && enabled,
    ...queryPolicyPresets['employees'],
  });
}

export function useEmployeeBoardingStatusQuery(id: string, enabled = true) {
  return useQuery<EmployeeBoardingSummary, Error>({
    queryKey: employeeKeys.boardingStatus(id),
    queryFn: () => fetchEmployeeBoardingStatus(id),
    enabled: Boolean(id) && enabled,
    ...queryPolicyPresets['employees'],
  });
}

/* ------------------------------------------------------------------ */
/* Change Employee Status                                              */
/* ------------------------------------------------------------------ */

export interface ChangeEmployeeStatusVariables {
  id: string;
  status: 'working' | 'probation' | 'terminated' | 'leave' | 'suspended' | 'retired';
  effectiveDate?: string | null;
  reason?: string | null;
}

export function useChangeEmployeeStatusMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<unknown, Error, ChangeEmployeeStatusVariables, MutationContext>
) {
  return useMutation<unknown, Error, ChangeEmployeeStatusVariables, MutationContext>({
    mutationFn: async ({ id, status, effectiveDate, reason }) => {
      return customFetch(`/api/v1/employees/${id}/change-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(effectiveDate ? { effectiveDate } : {}),
          ...(reason ? { reason } : {}),
        }),
      });
    },
    onMutate: async ({ id, status: _status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: employeeKeys.lists() }),
        queryClient.cancelQueries({ queryKey: employeeKeys.detail(id) }),
      ]);
      const previousLists = queryClient.getQueriesData<EmployeeListResult>({
        queryKey: employeeKeys.lists(),
      });
      const previousDetail = queryClient.getQueryData(employeeKeys.detail(id));

      setListEmployeeOptimistically(queryClient, id, (employee) => ({
        ...employee,
        status: _status,
      }));

      if (previousDetail) {
        queryClient.setQueryData(
          employeeKeys.detail(id),
          applyDetailCachePatch(previousDetail, { status: _status }),
        );
      }

      return { previousLists, previousDetail };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      for (const [key, snap] of ctx.previousLists) {
        queryClient.setQueryData(key, snap);
      }
      if (ctx.previousDetail) {
        queryClient.setQueryData(employeeKeys.detail(_vars.id), ctx.previousDetail);
      }
    },
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.statusHistory(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

/* ------------------------------------------------------------------ */
/* Rehire Employee Mutation                                           */
/* ------------------------------------------------------------------ */

export function useRehireEmployeeMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<RehireEmployeeResponse, Error, { id: string; data: RehireEmployeeRequest }>
) {
  return useMutation({
    mutationFn: async ({ id, data }) => {
      return rehireEmployee(id, data);
    },
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.statusHistory(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.boardingStatus(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

/* ------------------------------------------------------------------ */
/* Scheduled Termination & Transfer Mutations                         */
/* ------------------------------------------------------------------ */

export function useScheduleTerminationMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<ScheduleTerminationResponse, Error, { id: string; data: ScheduleTerminationRequest }>
) {
  return useMutation({
    mutationFn: async ({ id, data }) => scheduleEmployeeTermination(id, data),
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.workflowInstances(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

export function useCancelScheduledTerminationMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<{ success: boolean }, Error, string>
) {
  return useMutation({
    mutationFn: async (id) => cancelScheduledTermination(id),
    onSettled: async (_d, _e, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.workflowInstances(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

export function useRequestTransferMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<RequestTransferResponse, Error, { id: string; data: RequestTransferPayload }>
) {
  return useMutation({
    mutationFn: async ({ id, data }) => requestEmployeeTransfer(id, data),
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.workflowInstances(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

export function useApproveTransferMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<
    { success: boolean; role: string; newState: string },
    Error,
    { id: string; instanceId: string; stage: 'manager' | 'hr' }
  >
) {
  return useMutation({
    mutationFn: async ({ id, instanceId, stage }) =>
      stage === 'manager'
        ? managerApproveTransfer(id, instanceId)
        : hrApproveTransfer(id, instanceId),
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.workflowInstances(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

export function useRejectTransferMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<
    { success: boolean },
    Error,
    { id: string; instanceId: string; note?: string }
  >
) {
  return useMutation({
    mutationFn: async ({ id, instanceId, note }) =>
      rejectEmployeeTransfer(id, instanceId, note),
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.workflowInstances(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

export function useApplyTransferMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<
    { success: boolean; employeeId: string; effectiveDate: string },
    Error,
    { id: string; instanceId: string }
  >
) {
  return useMutation({
    mutationFn: async ({ id, instanceId }) =>
      applyEmployeeTransfer(id, instanceId),
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.workflowInstances(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

export function useCancelTransferMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<
    { success: boolean },
    Error,
    { id: string; instanceId: string }
  >
) {
  return useMutation({
    mutationFn: async ({ id, instanceId }) =>
      cancelEmployeeTransfer(id, instanceId),
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.workflowInstances(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}

export function useEvaluateProbationMutation(
  queryClient: QueryClient,
  options?: UseMutationOptions<
    EvaluateProbationResponse,
    Error,
    { id: string; data: EvaluateProbationPayload }
  >
) {
  return useMutation({
    mutationFn: async ({ id, data }) => evaluateEmployeeProbation(id, data),
    onSettled: async (_d, _e, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: employeeKeys.statusHistory(id) }),
        queryClient.invalidateQueries({ queryKey: timelineKeys.lists() }),
      ]);
    },
    ...options,
  });
}




