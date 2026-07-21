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
