import { shiftsRosterQueryOptions, type ShiftRosterRow } from '@/features/shifts';

export interface ScheduleFilters {
  from: string;
  to: string;
  tab?: string;
  search?: string;
  sort?: string;
}

export interface ScheduleListData {
  rows: ShiftRosterRow[];
  total: number;
}

export { shiftsRosterQueryOptions as scheduleRosterQueryOptions };
export type { ShiftRosterRow as ScheduleRow };
