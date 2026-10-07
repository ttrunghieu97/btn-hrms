import type { ReactNode } from 'react';

export interface DateRange {
  from: string;
  to: string;
}

export interface TimesheetRow {
  date: string;
  employee?: { lastName: string; firstName: string; employeeCode?: string };
  shiftName?: string;
  shiftCode?: string;
  clockIn?: string;
  clockOut?: string;
  morningCheckin?: string;
  afternoonCheckout?: string;
  checkIn?: string;
  checkOut?: string;
  workedMinutes?: number;
  payableMinutes?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  exceptionState?: string;
  attendanceOutcome?: string;
  blockedReasons?: string[];
  [key: string]: unknown;
}

export interface ExceptionItem {
  id: string;
  date?: string;
  workDate?: string;
  employeeName?: string;
  employee?: { firstName: string; lastName: string };
  type?: string;
  exceptionType?: string;
  reason?: string;
  description?: string;
  note?: string;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AdjustmentItem {
  id: string;
  date?: string;
  employee?: { firstName: string; lastName: string; employeeCode?: string; code?: string };
  type?: string;
  time?: string;
  note?: string;
  reason?: string;
  actorUserId?: string;
  [key: string]: unknown;
}
