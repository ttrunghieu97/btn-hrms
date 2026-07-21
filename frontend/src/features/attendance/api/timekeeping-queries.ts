import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  timekeepingControllerListEvents,
  timekeepingControllerListAttendanceExceptions,
  timekeepingControllerQueryAttendanceTimesheet,
  timekeepingControllerManualCorrection,
  timekeepingControllerCaptureClockEvent,
  timekeepingControllerResolveAttendanceException,
} from '@/api/generated/endpoints';
import type {
  TimekeepingControllerListEventsParams,
  TimekeepingControllerListAttendanceExceptionsParams,
  TimekeepingControllerQueryAttendanceTimesheetParams,
  CreateManualCorrectionDto,
  CreateClockEventDto,
  ResolveAttendanceExceptionDto,
} from '@/api/generated/model';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { extractList, extractPagination } from '@/lib/api-extract';

const keys = createKeyFactory('timekeeping');

export const timekeepingKeys = {
  ...keys,
  timesheets: (params?: TimekeepingControllerQueryAttendanceTimesheetParams) =>
    [...keys.all(), 'timesheets', params] as const,
  exceptions: (params?: TimekeepingControllerListAttendanceExceptionsParams) =>
    [...keys.all(), 'exceptions', params] as const,
  clockEvents: (params?: TimekeepingControllerListEventsParams) =>
    [...keys.all(), 'clock-events', params] as const,
};

export function useTimesheetQuery(params: TimekeepingControllerQueryAttendanceTimesheetParams) {
  return useQuery({
    queryKey: timekeepingKeys.timesheets(params),
    queryFn: ({ signal }) =>
      timekeepingControllerQueryAttendanceTimesheet(params, { signal }),
    select: (data) => {
      const records = extractList<any>(data);
      const pagination = extractPagination(data);
      const envelope = data && typeof data === 'object' && 'data' in data ? (data as any).data : null;
      const totals = envelope?.meta?.totals ?? null;
      return { records, pagination, totals };
    },
    ...queryPolicyPresets['static'],
  });
}

export function useExceptionsQuery(params: TimekeepingControllerListAttendanceExceptionsParams) {
  return useQuery({
    queryKey: timekeepingKeys.exceptions(params),
    queryFn: ({ signal }) =>
      timekeepingControllerListAttendanceExceptions(params, { signal }),
    select: (data) => ({
      records: extractList<any>(data),
      pagination: extractPagination(data),
    }),
    ...queryPolicyPresets.default,
  });
}

export function useClockEventsQuery(params: TimekeepingControllerListEventsParams) {
  return useQuery({
    queryKey: timekeepingKeys.clockEvents(params),
    queryFn: ({ signal }) =>
      timekeepingControllerListEvents(params, { signal }),
    select: (data) => ({
      records: extractList<any>(data),
      pagination: extractPagination(data),
    }),
    ...queryPolicyPresets.default,
  });
}

export function useManualCorrectionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateManualCorrectionDto) =>
      timekeepingControllerManualCorrection(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timekeepingKeys.all() });
    },
  });
}

export function useCaptureClockEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClockEventDto) =>
      timekeepingControllerCaptureClockEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timekeepingKeys.all() });
    },
  });
}

export function useResolveExceptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveAttendanceExceptionDto }) =>
      timekeepingControllerResolveAttendanceException(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timekeepingKeys.all() });
    },
  });
}
