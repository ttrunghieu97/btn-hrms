import { envClient } from "@/lib/env.client";
import { tokenStore } from "@/lib/token-store";

const BASE = `${envClient.apiBaseUrl.replace(/\/+$/, "")}/offboarding`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? tokenStore.get() : null;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
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
): Promise<{ rows: OffboardingProcessListItem[]; total: number }> {
  const json = await request<unknown>(`?page=${page}&limit=${limit}`);
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    const meta =
      ((obj.meta as Record<string, unknown> | undefined)?.pagination as
        | Record<string, unknown>
        | undefined) ?? (obj.meta as Record<string, unknown> | undefined);
    if (Array.isArray(obj.data)) {
      return {
        rows: obj.data as OffboardingProcessListItem[],
        total: Number(meta?.total ?? obj.data.length),
      };
    }
    if (Array.isArray(obj.rows)) {
      return {
        rows: obj.rows as OffboardingProcessListItem[],
        total: Number(obj.total ?? meta?.total ?? obj.rows.length),
      };
    }
  }
  return { rows: [], total: 0 };
}

export async function fetchOffboardingDetail(id: string): Promise<OffboardingProcessDetail> {
  const json = await request<unknown>(`/${id}`);
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object") {
      return obj.data as OffboardingProcessDetail;
    }
    return obj as unknown as OffboardingProcessDetail;
  }
  return json as OffboardingProcessDetail;
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
