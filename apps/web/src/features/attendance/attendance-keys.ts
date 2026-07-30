/**
 * Unified TanStack Query key factory for the entire Attendance module.
 *
 * Hierarchical design supports invalidate by scope:
 *   attendanceKeys.all                         → invalidates ALL attendance queries
 *   attendanceKeys.timesheet.all()             → invalidates ALL timesheet queries
 *   attendanceKeys.timesheet.timesheets(params) → specific timesheet list
 *
 * Every key starts with `"attendance"` so root-level granular cache busting
 * via queryClient.invalidateQueries({ queryKey: ["attendance"] }) works.
 */

import type {
  AttendanceQueryControllerCheckedInTodayParams,
  AttendanceQueryControllerFindAllParams,
  AttendanceQueryControllerGetMyAttendanceParams,
} from '@/api/generated/model';
import type {
  TimekeepingControllerQueryAttendanceTimesheetParams,
  TimekeepingControllerListAttendanceExceptionsParams,
  TimekeepingControllerListEventsParams,
} from '@/api/generated/model';

/* ------------------------------------------------------------------ */
/* Shared param type — used by both keys and queries                  */
/* ------------------------------------------------------------------ */

export type MyAttendanceQueryParams = AttendanceQueryControllerGetMyAttendanceParams & {
  month?: string;
};

/* ------------------------------------------------------------------ */
/* Key factory                                                        */
/* ------------------------------------------------------------------ */

export const attendanceKeys = {
  /** Root — invalidates everything under attendance */
  all: ['attendance'] as const,

  /** Prefix for all list-type queries (invalidates list caches broadly) */
  lists: () => ['attendance', 'list'] as const,

  // ── Home / Today ─────────────────────────────────────────────────

  /** My monthly attendance rows (history/home table) */
  myMonth: (params?: MyAttendanceQueryParams) =>
    ['attendance', 'me', 'month', params] as const,

  /** Employees checked in today (presence summary badge) */
  checkedInToday: (params?: AttendanceQueryControllerCheckedInTodayParams) =>
    ['attendance', 'checked-in-today', params] as const,

  /** Today attendance for home screen (must match generated endpoint key) */
  today: () => ['/api/v1/attendances/today'] as const,

  // ── List / Management ────────────────────────────────────────────

  /** Paginated attendance list (management view) */
  list: (params?: AttendanceQueryControllerFindAllParams) =>
    ['attendance', 'list', params] as const,

  // ── Dashboard / Analytics ────────────────────────────────────────

  dashboard: {
    all: () => ['attendance', 'dashboard'] as const,
    stats: (month?: string) =>
      ['attendance', 'dashboard', 'stats', month ?? 'current'] as const,
  },

  // ── Timesheet ────────────────────────────────────────────────────

  timesheet: {
    all: () => ['attendance', 'timesheet'] as const,
    timesheets: (
      params?: TimekeepingControllerQueryAttendanceTimesheetParams,
    ) => ['attendance', 'timesheet', 'timesheets', params] as const,
    exceptions: (
      params?: TimekeepingControllerListAttendanceExceptionsParams,
    ) => ['attendance', 'timesheet', 'exceptions', params] as const,
    clockEvents: (
      params?: TimekeepingControllerListEventsParams,
    ) => ['attendance', 'timesheet', 'clock-events', params] as const,
  },
};
