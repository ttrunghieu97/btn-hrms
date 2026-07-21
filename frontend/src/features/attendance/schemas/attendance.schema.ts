/**
 * Attendance zod schemas.
 * Legacy file was a 4-LOC stub — this introduces the validation surface
 * for the BE attendance endpoints based on AttendanceResponseDto and
 * AttendancesControllerCheckAttendanceFromWebBody from `@/api/generated/model`.
 */

import { z } from 'zod';
import { validationCopy } from '@/lib/feedback-copy';

export const attendanceSessionSchema = z.enum(['morning', 'noon', 'afternoon']);
export type AttendanceSession = z.infer<typeof attendanceSessionSchema>;

export const attendanceTypeSchema = z.enum(['checkin', 'checkout', 'check']);
export type AttendanceType = z.infer<typeof attendanceTypeSchema>;

const monthString = z
  .string()
  .regex(/^\d{4}-\d{2}$/, validationCopy.attendance.invalidMonth);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, validationCopy.attendance.invalidDate);

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, validationCopy.attendance.invalidTime);

export const attendanceCheckInputSchema = z.object({
  session: attendanceSessionSchema,
  type: attendanceTypeSchema,
  note: z.string().max(500).optional(),
  imageUrl: z.string().url().optional()
});
export type AttendanceCheckInput = z.infer<typeof attendanceCheckInputSchema>;

export const attendanceListParamsSchema = z.object({
  month: monthString.optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(500).optional()
});
export type AttendanceListParams = z.infer<typeof attendanceListParamsSchema>;

export const attendanceMyMonthParamsSchema = z.object({
  month: monthString
});
export type AttendanceMyMonthParams = z.infer<
  typeof attendanceMyMonthParamsSchema
>;

/** Local UI shape used by the calculation utilities. */
export interface SessionTimes {
  checkin?: string | null;
  checkout?: string | null;
}

export const sessionTimesSchema = z.object({
  checkin: timeString.nullable().optional(),
  checkout: timeString.nullable().optional()
});
