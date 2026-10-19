import { customFetch } from "@/lib/fetcher";
import { extractList, extractPagination, unwrapData } from "@/lib/api-extract";

const BASE = "/api/v1/offboarding";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  return customFetch<T>(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export interface OffboardingProcessListItem {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
}

export interface OffboardingProcessDetail {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
  checklistItems: unknown[];
  clearances: unknown[];
}

export async function fetchOffboardingList(
  page = 1,
  limit = 20,
  status?: string | null,
): Promise<{ rows: OffboardingProcessListItem[]; total: number }> {
  const statusQuery = status ? `&status=${encodeURIComponent(status)}` : "";
  const json = await request<unknown>(`?page=${page}&limit=${limit}${statusQuery}`);
  const rows = extractList<OffboardingProcessListItem>(json);
  const pagination = extractPagination(json);
  return {
    rows,
    total: Number(pagination?.total ?? rows.length),
  };
}

export async function fetchOffboardingDetail(id: string): Promise<OffboardingProcessDetail> {
  const json = await request<unknown>(`/${id}`);
  return unwrapData<OffboardingProcessDetail>(json);
}

export async function completeChecklistItem(processId: string, taskId: string, skip = false) {
  const res = await request<unknown>(`/${processId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ skip }),
  });
  return res && typeof res === "object" && "data" in res
    ? (res as Record<string, unknown>).data
    : res;
}

export async function decideClearance(
  processId: string,
  department: string,
  decision: string,
  note?: string,
) {
  const res = await request<unknown>(`/${processId}/clearances/${department}`, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
  return res && typeof res === "object" && "data" in res
    ? (res as Record<string, unknown>).data
    : res;
}

export async function scheduleExitInterview(
  processId: string,
  data: { employeeId: string; interviewerUserId: string; scheduledAt: string },
) {
  const res = await request<unknown>(`/${processId}/exit-interview`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res && typeof res === "object" && "data" in res
    ? (res as Record<string, unknown>).data
    : res;
}

export async function recordExitInterview(
  processId: string,
  data: { responses?: Record<string, unknown>; notes?: string },
) {
  const res = await request<unknown>(`/${processId}/exit-interview`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res && typeof res === "object" && "data" in res
    ? (res as Record<string, unknown>).data
    : res;
}

export async function completeProcess(processId: string) {
  const res = await request<unknown>(`/${processId}/complete`, { method: "POST" });
  return res && typeof res === "object" && "data" in res
    ? (res as Record<string, unknown>).data
    : res;
}
