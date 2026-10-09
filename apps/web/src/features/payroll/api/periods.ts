import { customFetch } from "@/lib/fetcher";
import { unwrapData } from "@/lib/api-extract";
import { toPayrollPeriod } from "./payroll-period-mapper";
import type {
  PayrollPeriod,
  PayrollPeriodListParams,
  CreatePayrollPeriodPayload,
  UpdatePayrollPeriodPayload,
} from "../types";

export interface PayrollPeriodListResponse {
  rows: PayrollPeriod[];
  page: number;
  limit: number;
  total: number;
}

export async function listPayrollPeriods(
  params?: PayrollPeriodListParams,
): Promise<PayrollPeriodListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  const res = await customFetch<unknown>(`/api/v1/payroll/periods${qs ? "?" + qs : ""}`);
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
    rows: rawRows.map((r) => toPayrollPeriod(r as Record<string, unknown>)),
    page: meta?.page ?? payload?.page ?? params?.page ?? 1,
    limit: meta?.limit ?? payload?.limit ?? params?.limit ?? 20,
    total: meta?.total ?? payload?.total ?? rawRows.length,
  };
}

export async function getPayrollPeriod(id: string): Promise<PayrollPeriod> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/periods/${id}`);
  return toPayrollPeriod(unwrapData(res) as Record<string, unknown>);
}

export async function createPayrollPeriod(
  payload: CreatePayrollPeriodPayload,
): Promise<PayrollPeriod> {
  const res = await customFetch<{ data: unknown }>("/api/v1/payroll/periods", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  return toPayrollPeriod(unwrapData(res) as Record<string, unknown>);
}

export async function updatePayrollPeriod(
  id: string,
  payload: UpdatePayrollPeriodPayload,
): Promise<PayrollPeriod> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/periods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  return toPayrollPeriod(unwrapData(res) as Record<string, unknown>);
}
