import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import {
  attendanceCommandControllerCheckAttendanceFromWeb,
  attendanceQueryControllerCheckedInToday,
  attendanceQueryControllerFindAll,
  attendanceQueryControllerGetMyAttendance
} from '@/api/generated/endpoints';
import type {
  AttendanceResponseDto,
  AttendanceCommandControllerCheckAttendanceFromWebBody,
  AttendanceQueryControllerCheckedInTodayParams,
  AttendanceQueryControllerFindAllParams,
  AttendanceQueryControllerGetMyAttendanceParams
} from '@/api/generated/model';
import { extractList, extractPagination } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

// Idempotency key generator (browser-safe)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function idempotencyKey(date: string, session: string, type: string): string {
  return simpleHash(`${date}:${session}:${type}`);
}

const root = createKeyFactory<AttendanceQueryControllerFindAllParams>('attendance');

export type MyAttendanceQueryParams = AttendanceQueryControllerGetMyAttendanceParams & {
  month?: string;
};

export const attendanceKeys = {
  ...root,
  myMonth: (params?: MyAttendanceQueryParams) =>
    [...root.all(), 'me', 'month', params] as const,
  checkedInToday: (params?: AttendanceQueryControllerCheckedInTodayParams) =>
    [...root.all(), 'checked-in-today', params] as const,
  todayAttendance: () => ['/api/v1/attendances/today'] as const,
};

export const attendanceInvalidations = {
  list: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
  },
  myMonth: async (queryClient: QueryClient, params?: MyAttendanceQueryParams) => {
    await queryClient.invalidateQueries({ queryKey: attendanceKeys.myMonth(params) });
  },
  todayAttendance: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: attendanceKeys.todayAttendance() });
  },
  all: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: attendanceKeys.all() });
  }
};

export function useMyMonthAttendanceQuery(
  params: MyAttendanceQueryParams = {}
) {
  return useQuery({
    queryKey: attendanceKeys.myMonth(params),
    queryFn: ({ signal }) =>
      attendanceQueryControllerGetMyAttendance(
        params as AttendanceQueryControllerGetMyAttendanceParams,
        { signal }
      ),
    select: (data) => {
      const envelope = (data as any)?.data;
      return {
        attendances: extractList<AttendanceResponseDto>(data),
        pagination: extractPagination(data),
        summary: envelope?.meta?.summary ?? null,
        raw: data
      };
    },
    ...queryPolicyPresets.default
  });
}

export function useAttendancesQuery(
  params: AttendanceQueryControllerFindAllParams = {}
) {
  return useQuery({
    queryKey: attendanceKeys.list(params),
    queryFn: ({ signal }) => attendanceQueryControllerFindAll(params, { signal }),
    select: (data) => ({
      records: extractList<AttendanceResponseDto>(data),
      pagination: extractPagination(data),
      raw: data
    }),
    ...queryPolicyPresets.default
  });
}

export function useCheckedInTodayQuery(
  params: AttendanceQueryControllerCheckedInTodayParams
) {
  return useQuery({
    queryKey: attendanceKeys.checkedInToday(params),
    queryFn: ({ signal }) => attendanceQueryControllerCheckedInToday(params, { signal }),
    ...queryPolicyPresets['fast-changing']
  });
}

interface CheckMutationContext {
  previous: Array<[readonly unknown[], unknown]>;
}

interface CheckMutationVars {
  body: AttendanceCommandControllerCheckAttendanceFromWebBody;
  monthParams?: MyAttendanceQueryParams;
}

export function useCheckAttendanceMutation(queryClient: QueryClient) {
  return useMutation<unknown, Error, CheckMutationVars, CheckMutationContext>({
    mutationFn: ({ body }) => {
      const key = idempotencyKey(body.date, body.session, body.type);
      return attendanceCommandControllerCheckAttendanceFromWeb(body, {
        headers: { "Idempotency-Key": key },
      });
    },
    onMutate: async ({ body, monthParams }) => {
      if (!monthParams) return { previous: [] };
      await queryClient.cancelQueries({
        queryKey: attendanceKeys.myMonth(monthParams)
      });
      const previous = queryClient.getQueriesData({
        queryKey: attendanceKeys.myMonth(monthParams)
      });
      queryClient.setQueriesData(
        { queryKey: attendanceKeys.myMonth(monthParams) },
        (cached: unknown) => {
          if (!cached || typeof cached !== 'object') return cached;
          const list = (cached as { data?: AttendanceResponseDto[] }).data;
          if (!Array.isArray(list)) return cached;
          return {
            ...cached,
            data: list.map((record) =>
              record.date === body.date
                ? ({ ...record, updatedAt: new Date().toISOString() } as AttendanceResponseDto)
                : record
            )
          };
        }
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (!context) return;
      for (const [key, snapshot] of context.previous) {
        queryClient.setQueryData(key, snapshot);
      }
    },
    onSettled: async (_data, _error, vars) => {
      // Always refresh today-attendance (home screen)
      await attendanceInvalidations.todayAttendance(queryClient);

      if (vars.monthParams) {
        await attendanceInvalidations.myMonth(queryClient, vars.monthParams);
        return;
      }
      await attendanceInvalidations.all(queryClient);
    }
  });
}
