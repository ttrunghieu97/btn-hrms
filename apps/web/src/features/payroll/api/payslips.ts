import { customFetch } from "@/lib/fetcher";
import { unwrapData } from "@/lib/api-extract";
import { toPayslip } from "./payslip-mapper";
import type { Payslip, PayslipListParams, PublishPayslipPayload } from "../types";

export interface PayslipListResponse {
  rows: Payslip[];
  page: number;
  limit: number;
  total: number;
}

export async function listPayslips(params?: PayslipListParams): Promise<PayslipListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params?.payrollRunId) searchParams.set("payrollRunId", params.payrollRunId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  const res = await customFetch<unknown>(`/api/v1/payroll/payslips${qs ? "?" + qs : ""}`);
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
    rows: rawRows.map((r) => toPayslip(r as Record<string, unknown>)),
    page: meta?.page ?? payload?.page ?? params?.page ?? 1,
    limit: meta?.limit ?? payload?.limit ?? params?.limit ?? 20,
    total: meta?.total ?? payload?.total ?? rawRows.length,
  };
}

export async function getPayslip(id: string): Promise<Payslip> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/payslips/${id}`);
  return toPayslip(unwrapData(res) as Record<string, unknown>);
}

export async function publishPayslip(
  id: string,
  payload?: PublishPayslipPayload,
): Promise<Payslip> {
  const res = await customFetch<{ data: unknown }>(`/api/v1/payroll/payslips/${id}/publish`, {
    method: "PATCH",
    body: JSON.stringify(payload ?? {}),
    headers: { "Content-Type": "application/json" },
  });
  return toPayslip(unwrapData(res) as Record<string, unknown>);
}
