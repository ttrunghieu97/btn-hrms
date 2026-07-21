import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';
import { queryPolicyPresets } from '@/lib/query-client';
import { createKeyFactory } from '@/lib/query-keys';

const attDashKeys = createKeyFactory('attendance-dashboard');

export interface AttendanceStatsResponseDto {
  summary: {
    attendanceRate: number;
    presentToday: number;
    totalEmployees: number;
    pendingExceptions: number;
    avgWorkedHours: number;
  };
  dailyTrend: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
  }>;
  departmentRates: Array<{
    departmentName: string;
    attendanceRate: number;
    totalEmployees: number;
  }>;
  exceptionSummary: Array<{
    type: string;
    count: number;
    pending: number;
    resolved: number;
  }>;
  overtimeBreakdown: {
    approvedMinutes: number;
    pendingMinutes: number;
    employeeCount: number;
  };
}

export interface DashboardControllerGetAttendanceStatsEndpointParams {
  month?: string;
}

export function useAttendanceStatsQuery(month?: string) {
  const params: DashboardControllerGetAttendanceStatsEndpointParams | undefined = month
    ? { month }
    : undefined;

  return useQuery({
    queryKey: attDashKeys.detail(month ?? 'current'),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams();
      if (params?.month) searchParams.set('month', params.month);
      const qs = searchParams.toString();
      const res = await customFetch<unknown>(
        `/api/v1/dashboard/attendance-stats${qs ? '?' + qs : ''}`,
        { signal },
      );
      return unwrapData<AttendanceStatsResponseDto>(res);
    },
    ...queryPolicyPresets['dashboard'],
  });
}
