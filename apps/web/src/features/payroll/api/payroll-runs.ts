import { customFetch } from "@/lib/fetcher";
import { unwrapData } from "@/lib/api-extract";
import { toPayrollRun } from "./payroll-run-mapper";
import type {
  PayrollRun,
  PayrollRunListParams,
  CreatePayrollRunPayload,
  UpdatePayrollRunPayload,
} from "../types";

export interface PayrollRunListResponse {
  rows: PayrollRun[];
  page: number;
  limit: number;
  total: number;
}

export async function listPayrollRuns(
  params?: PayrollRunListParams,
): Promise<PayrollRunListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.payrollPeriodId) searchParams.set("payrollPeriodId", params.payrollPeriodId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  const res = await customFetch<unknown>(`/api/v1/payroll/runs${qs ? "?" + qs : ""}`);
  const raw = (res as { data?: unknown })?.data ?? res;
  const payload = raw as {
    data?: unknown[];
    rows?: unknown[];
    meta?: {
      page?: number;
      limit?: number;
      total?: number;
      pagination?: { page?: number; limit?: number; total?: number };
    };
    total?: number;
    page?: number;
    limit?: number;
  };
  const rawRows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.rows)
      ? payload.rows
      : Array.isArray(raw)
        ? (raw as unknown[])
        : [];
  const meta = payload?.meta?.pagination ?? payload?.meta;
  return {
    rows: rawRows.map((r) => toPayrollRun(r as Record<string, unknown>)),
    page: meta?.page ?? payload?.page ?? params?.page ?? 1,
    limit: meta?.limit ?? payload?.limit ?? params?.limit ?? 20,
    total: meta?.total ?? payload?.total ?? rawRows.length,
  };
}

export async function getPayrollRun(id: string): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/runs/${id}`);
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function createPayrollRun(payload: CreatePayrollRunPayload): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>("/api/v1/payroll/runs", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function updatePayrollRun(
  id: string,
  payload: UpdatePayrollRunPayload,
): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/runs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function generatePayrollRun(id: string): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/runs/${id}/generate`, {
    method: "POST",
  });
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function requestApprovalPayrollRun(id: string): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/runs/${id}/request-approval`, {
    method: "POST",
  });
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function approvePayrollRun(id: string): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/runs/${id}/approve`, {
    method: "POST",
  });
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function rejectPayrollRun(id: string, reason: string): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/runs/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}

export async function postPayrollRun(id: string): Promise<PayrollRun> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/runs/${id}/post`, {
    method: "POST",
  });
  return toPayrollRun(unwrapData(res) as Record<string, unknown>);
}
