import { createKeyFactory } from '@/lib/query-keys';

export type LeaveListFilters = {
  page?: number;
  limit?: number;
  status?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
};

export const leaveKeys = {
  ...createKeyFactory<LeaveListFilters>('leave'),
  balances: (employeeId?: string) =>
    ['leave', 'balances', employeeId] as const,
  policies: (filters?: Record<string, string>) =>
    ['leave', 'policies', filters] as const,
  types: (filters?: Record<string, string>) =>
    ['leave', 'types', filters] as const,
};
