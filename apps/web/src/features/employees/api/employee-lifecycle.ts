import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';

export interface ChangeEmployeeStatusRequest {
  status: string;
  effectiveDate?: string;
  reason?: string;
}

export interface ChangeEmployeeStatusResponse {
  success: boolean;
  status: string;
}

export interface EmployeeStatusHistoryItem {
  id: string;
  status: string;
  notes: string | null;
  changedAt: string;
  changedByUserId: string | null;
  changedByName: string | null;
}

/** PUT /admin/employees/:id/change-status */
export async function changeEmployeeStatus(
  id: string,
  data: ChangeEmployeeStatusRequest,
): Promise<ChangeEmployeeStatusResponse> {
  const response = await customFetch<ChangeEmployeeStatusResponse>(
    `/api/v1/employees/${id}/change-status`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/** GET /employees/:id/status-history */
export async function fetchEmployeeStatusHistory(
  id: string,
): Promise<EmployeeStatusHistoryItem[]> {
  const response = await customFetch<EmployeeStatusHistoryItem[]>(
    `/api/v1/employees/${id}/status-history`,
  );
  return unwrapData(response);
}

export interface TerminateEmployeeRequest {
  reason: string;
  effectiveDate: string;
  lastWorkingDate?: string;
}

export interface TerminateEmployeeResponse {
  success: boolean;
}

/** PUT /api/v1/employees/:id/terminate */
export async function terminateEmployee(
  id: string,
  data: TerminateEmployeeRequest,
): Promise<TerminateEmployeeResponse> {
  const response = await customFetch<TerminateEmployeeResponse>(
    `/api/v1/employees/${id}/terminate`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/** PUT /api/v1/employees/:id/change-status */
export async function updateEmployeeStatus(
  id: string,
  data: ChangeEmployeeStatusRequest,
): Promise<ChangeEmployeeStatusResponse> {
  const response = await customFetch<ChangeEmployeeStatusResponse>(
    `/api/v1/employees/${id}/change-status`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/** GET /api/v1/employees/:id/status-history */
export async function getEmployeeStatusHistory(
  id: string,
): Promise<EmployeeStatusHistoryItem[]> {
  const response = await customFetch<EmployeeStatusHistoryItem[]>(
    `/api/v1/employees/${id}/status-history`,
  );
  return unwrapData(response);
}

export interface RehireEmployeeRequest {
  hireDate: string;
  status?: 'working' | 'probation';
  departmentId?: string;
  positionId?: string;
  managerEmployeeId?: string;
  jobTitle?: string;
  contractType: string;
  contractStatus: string;
  reason?: string;
}

export interface RehireEmployeeResponse {
  success: boolean;
  employeeId: string;
  status: string;
  employmentRecordId: string;
}

/** POST /api/v1/employees/:id/rehire */
export async function rehireEmployee(
  id: string,
  data: RehireEmployeeRequest,
): Promise<RehireEmployeeResponse> {
  const response = await customFetch<RehireEmployeeResponse>(
    `/api/v1/employees/${id}/rehire`,
    {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/* ------------------------------------------------------------------ */
/* Scheduled Termination APIs                                          */
/* ------------------------------------------------------------------ */

export interface ScheduleTerminationRequest {
  effectiveDate: string;
  reason: string;
  lastWorkingDate?: string;
}

export interface ScheduleTerminationResponse {
  success: boolean;
  workflowInstanceId: string;
  effectiveDate: string;
}

/** POST /api/v1/employees/:id/schedule-termination */
export async function scheduleEmployeeTermination(
  id: string,
  data: ScheduleTerminationRequest,
): Promise<ScheduleTerminationResponse> {
  const response = await customFetch<ScheduleTerminationResponse>(
    `/api/v1/employees/${id}/schedule-termination`,
    {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/** DELETE /api/v1/employees/:id/scheduled-termination */
export async function cancelScheduledTermination(
  id: string,
): Promise<{ success: boolean }> {
  const response = await customFetch<{ success: boolean }>(
    `/api/v1/employees/${id}/scheduled-termination`,
    {
      method: 'DELETE',
    },
  );
  return unwrapData(response);
}

/* ------------------------------------------------------------------ */
/* Employee Transfer Workflow APIs (2-Level Approval)                  */
/* ------------------------------------------------------------------ */

export interface RequestTransferPayload {
  effectiveDate: string;
  toDepartmentId: string;
  toPositionId?: string;
  toManagerEmployeeId?: string;
  toJobTitle?: string;
  reason?: string;
}

export interface RequestTransferResponse {
  success: boolean;
  workflowInstanceId: string;
  status: string;
}

/** POST /api/v1/employees/:id/transfers */
export async function requestEmployeeTransfer(
  id: string,
  data: RequestTransferPayload,
): Promise<RequestTransferResponse> {
  const response = await customFetch<RequestTransferResponse>(
    `/api/v1/employees/${id}/transfers`,
    {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/** POST /api/v1/employees/:id/transfers/:instanceId/manager-approve */
export async function managerApproveTransfer(
  id: string,
  instanceId: string,
): Promise<{ success: boolean; role: string; newState: string }> {
  const response = await customFetch<{ success: boolean; role: string; newState: string }>(
    `/api/v1/employees/${id}/transfers/${instanceId}/manager-approve`,
    {
      method: 'POST',
    },
  );
  return unwrapData(response);
}

/** POST /api/v1/employees/:id/transfers/:instanceId/hr-approve */
export async function hrApproveTransfer(
  id: string,
  instanceId: string,
): Promise<{ success: boolean; role: string; newState: string }> {
  const response = await customFetch<{ success: boolean; role: string; newState: string }>(
    `/api/v1/employees/${id}/transfers/${instanceId}/hr-approve`,
    {
      method: 'POST',
    },
  );
  return unwrapData(response);
}

/** POST /api/v1/employees/:id/transfers/:instanceId/reject */
export async function rejectEmployeeTransfer(
  id: string,
  instanceId: string,
  note?: string,
): Promise<{ success: boolean }> {
  const response = await customFetch<{ success: boolean }>(
    `/api/v1/employees/${id}/transfers/${instanceId}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/** POST /api/v1/employees/:id/transfers/:instanceId/apply */
export async function applyEmployeeTransfer(
  id: string,
  instanceId: string,
): Promise<{ success: boolean; employeeId: string; effectiveDate: string }> {
  const response = await customFetch<{ success: boolean; employeeId: string; effectiveDate: string }>(
    `/api/v1/employees/${id}/transfers/${instanceId}/apply`,
    {
      method: 'POST',
    },
  );
  return unwrapData(response);
}

/** POST /api/v1/employees/:id/transfers/:instanceId/cancel */
export async function cancelEmployeeTransfer(
  id: string,
  instanceId: string,
): Promise<{ success: boolean }> {
  const response = await customFetch<{ success: boolean }>(
    `/api/v1/employees/${id}/transfers/${instanceId}/cancel`,
    {
      method: 'POST',
    },
  );
  return unwrapData(response);
}

/* ------------------------------------------------------------------ */
/* Workflow Instances & Boarding Process Summary for Employee          */
/* ------------------------------------------------------------------ */

export interface EmployeeWorkflowInstanceItem {
  id: string;
  definitionId: string;
  subjectType: string;
  subjectId: string;
  currentState: string;
  status: string;
  startedAt?: string;
  completedAt?: string | null;
  metadata?: {
    effectiveDate?: string;
    reason?: string | null;
    lastWorkingDate?: string | null;
    toDepartmentId?: string;
    toPositionId?: string | null;
    toManagerEmployeeId?: string | null;
    toJobTitle?: string | null;
    requestedByUserId?: string | null;
    scheduledByUserId?: string | null;
  } | null;
}

/** GET /api/v1/workflow-instances?subjectId=:employeeId */
export async function fetchEmployeeWorkflowInstances(
  employeeId: string,
): Promise<EmployeeWorkflowInstanceItem[]> {
  try {
    const response = await customFetch<unknown>(
      `/api/v1/workflow-instances?subjectId=${encodeURIComponent(employeeId)}&limit=20`,
    );
    const unwrapped = unwrapData<unknown>(response);
    if (Array.isArray(unwrapped)) {
      return unwrapped as EmployeeWorkflowInstanceItem[];
    }
    if (unwrapped && typeof unwrapped === 'object') {
      const obj = unwrapped as Record<string, unknown>;
      if (Array.isArray(obj.rows)) return obj.rows as EmployeeWorkflowInstanceItem[];
      if (Array.isArray(obj.data)) return obj.data as EmployeeWorkflowInstanceItem[];
    }
    return [];
  } catch {
    return [];
  }
}

export interface EmployeeBoardingSummary {
  onboarding: {
    id: string;
    status: string;
    startDate: string;
    targetEndDate?: string | null;
  } | null;
  offboarding: {
    id: string;
    status: string;
    startDate: string;
  } | null;
}

function extractRows<T>(raw: unknown): T[] {
  const unwrapped = unwrapData<unknown>(raw);
  if (Array.isArray(unwrapped)) return unwrapped as T[];
  if (unwrapped && typeof unwrapped === 'object') {
    const obj = unwrapped as Record<string, unknown>;
    if (Array.isArray(obj.rows)) return obj.rows as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

/** Fetch matching onboarding & offboarding processes for an employee */
export async function fetchEmployeeBoardingStatus(
  employeeId: string,
): Promise<EmployeeBoardingSummary> {
  const encodedId = encodeURIComponent(employeeId);
  const [onbRes, offbRes] = await Promise.allSettled([
    customFetch<unknown>(`/api/v1/onboarding/processes?employeeId=${encodedId}&page=1&limit=10`),
    customFetch<unknown>(`/api/v1/offboarding?employeeId=${encodedId}&page=1&limit=10`),
  ]);

  let onboarding: EmployeeBoardingSummary['onboarding'] = null;
  if (onbRes.status === 'fulfilled') {
    const rows = extractRows<{
      id: string;
      employeeId: string;
      status: string;
      startDate: string;
      targetEndDate?: string | null;
    }>(onbRes.value);
    const match = rows.find((r) => r.employeeId === employeeId);
    if (match) {
      onboarding = {
        id: match.id,
        status: match.status,
        startDate: match.startDate,
        targetEndDate: match.targetEndDate,
      };
    }
  }

  let offboarding: EmployeeBoardingSummary['offboarding'] = null;
  if (offbRes.status === 'fulfilled') {
    const rows = extractRows<{
      id: string;
      employeeId: string;
      status: string;
      startDate: string;
    }>(offbRes.value);
    const match = rows.find((r) => r.employeeId === employeeId);
    if (match) {
      offboarding = {
        id: match.id,
        status: match.status,
        startDate: match.startDate,
      };
    }
  }

  return { onboarding, offboarding };
}

/* ------------------------------------------------------------------ */
/* Bulk Lifecycle Operations                                           */
/* ------------------------------------------------------------------ */

export interface BulkResultItem {
  employeeId: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkResultItem[];
}

export interface BulkChangeStatusRequest {
  employeeIds: string[];
  status: 'working' | 'probation' | 'leave' | 'suspended' | 'retired';
  effectiveDate?: string;
  reason?: string;
}

/** POST /api/v1/employees/bulk/status */
export async function bulkChangeEmployeeStatus(
  data: BulkChangeStatusRequest,
): Promise<BulkOperationResponse> {
  const response = await customFetch<BulkOperationResponse>(
    '/api/v1/employees/bulk/status',
    {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/** POST /api/v1/employees/bulk/archive */
export async function bulkArchiveEmployees(
  employeeIds: string[],
): Promise<BulkOperationResponse> {
  const response = await customFetch<BulkOperationResponse>(
    '/api/v1/employees/bulk/archive',
    {
      method: 'POST',
      body: JSON.stringify({ employeeIds }),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

/* ------------------------------------------------------------------ */
/* Probation Evaluation (PD-01)                                        */
/* ------------------------------------------------------------------ */

export interface EvaluateProbationPayload {
  decision: 'confirm' | 'extend' | 'fail';
  effectiveDate?: string;
  extendedEndDate?: string;
  lastWorkingDate?: string;
  notes?: string;
}

export interface EvaluateProbationResponse {
  success: boolean;
  decision: 'confirm' | 'extend' | 'fail';
  status: string;
  probationEndDate?: string | null;
}

/** POST /api/v1/employees/:id/probation/evaluate */
export async function evaluateEmployeeProbation(
  id: string,
  data: EvaluateProbationPayload,
): Promise<EvaluateProbationResponse> {
  const { extendedEndDate, lastWorkingDate: _lastWorkingDate, ...rest } = data;
  const payload = {
    ...rest,
    ...(extendedEndDate ? { newProbationEndDate: extendedEndDate } : {}),
  };
  const response = await customFetch<EvaluateProbationResponse>(
    `/api/v1/employees/${id}/probation/evaluate`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return unwrapData(response);
}

