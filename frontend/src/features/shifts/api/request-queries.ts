import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@/lib/fetcher';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { extractList, unwrapData } from '@/lib/api-extract';
import { toast } from 'sonner';
import { scheduleUiCopy } from '@/lib/app-copy';

export interface ScheduleRequestDto {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  requestType: string;
  reason?: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface CreateScheduleRequestInput {
  requestType: 'MORNING_OFF' | 'AFTERNOON_OFF' | 'FULL_DAY_OFF';
  date: string;
  reason?: string;
}

const BASE = '/api/v1/workforce/schedules';

export const requestKeys = createKeyFactory('schedule-requests');

export function allRequestsQueryOptions(
  params?: { status?: string; employeeId?: string },
  requestInit?: RequestInit,
) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.employeeId) search.set('employeeId', params.employeeId);
  const qs = search.toString();
  return queryOptions({
    queryKey: requestKeys.all(),
    queryFn: async () => {
      const res = await customFetch(`${BASE}/schedule-requests${qs ? `?${qs}` : ''}`, requestInit);
      const data = extractList<ScheduleRequestDto>(res);
      return data.filter(Boolean);
    },
    ...queryPolicyPresets['default'],
  });
}

export function useAllRequests(params?: { status?: string; employeeId?: string }) {
  return useQuery(allRequestsQueryOptions(params));
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateScheduleRequestInput) => {
      const res = await customFetch(`${BASE}/schedule-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return unwrapData<ScheduleRequestDto>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.all() });
      toast.success(scheduleUiCopy.requests.success);
    },
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await customFetch(`${BASE}/schedule-requests/${id}/approve`, { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.all() });
      toast.success(scheduleUiCopy.requests.acceptAction);
    },
  });
}

export function useDenyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await customFetch(`${BASE}/schedule-requests/${id}/deny`, { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.all() });
      toast.success(scheduleUiCopy.requests.denyAction);
    },
  });
}
