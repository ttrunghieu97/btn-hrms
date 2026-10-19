import {
  applyDayPatchToRecord,
  calculateWorkedMinutesFromPunches,
  resolvePatchedAttendanceStatus,
} from './detail-sheet';
import { computeMonthStats } from '../kpi-summary';
import type {
  TimesheetWorkspaceEmployee,
  TimesheetWorkspaceRecord,
} from '../types';

describe('detail-sheet calculation and status helpers', () => {
  describe('calculateWorkedMinutesFromPunches', () => {
    it('does not double-deduct breakMinutes on a single full-day punch span', () => {
      // 08:00 to 17:00 = 540 mins. With breakMinutes = 60, worked should be 480 (not 420)
      const worked = calculateWorkedMinutesFromPunches({
        checkInMorning: '08:00',
        checkOutMorning: null,
        checkInAfternoon: null,
        checkOutAfternoon: '17:00',
        breakMinutes: 60,
        personalBreakMinutes: 0,
        lunchDutyMinutes: 0,
        duty30kMinutes: 0,
      });

      expect(worked).toBe(480);
    });

    it('uses default 90-minute lunch deduction when breakMinutes is null on a single full-day span', () => {
      // 07:30 to 17:00 = 570 mins - 90 mins lunch = 480 mins
      const worked = calculateWorkedMinutesFromPunches({
        checkInMorning: '07:30',
        checkOutMorning: null,
        checkInAfternoon: null,
        checkOutAfternoon: '17:00',
        breakMinutes: null,
      });

      expect(worked).toBe(480);
    });

    it('deducts breakMinutes once when morning and afternoon punches are both provided', () => {
      // 08:00-12:00 (240) + 13:00-17:00 (240) = 480 - 30 break = 450
      const worked = calculateWorkedMinutesFromPunches({
        checkInMorning: '08:00',
        checkOutMorning: '12:00',
        checkInAfternoon: '13:00',
        checkOutAfternoon: '17:00',
        breakMinutes: 30,
      });

      expect(worked).toBe(450);
    });
  });

  describe('resolvePatchedAttendanceStatus & applyDayPatchToRecord', () => {
    it('preserves leave and holiday statuses when editing a note or allowance with 0 worked minutes', () => {
      const existingLeaveRecord: TimesheetWorkspaceRecord = {
        employeeId: 'emp-1',
        workDate: '2026-10-15',
        status: 'leave',
        workedMinutes: 0,
        scheduledMinutes: 480,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        isHoliday: false,
        note: null,
      };

      const patched = applyDayPatchToRecord(
        existingLeaveRecord,
        'emp-1',
        '2026-10-15',
        false,
        { note: 'Nghỉ phép năm có đơn' },
      );

      expect(patched.status).toBe('leave');
      expect(patched.note).toBe('Nghỉ phép năm có đơn');
    });

    it('preserves late and early_leave statuses when workedMinutes > 0 and status is not explicitly overridden', () => {
      expect(
        resolvePatchedAttendanceStatus({
          currentStatus: 'late',
          workedMinutes: 450,
          isSun: false,
        }),
      ).toBe('late');
    });
  });

  describe('computeMonthStats', () => {
    it('computes pure attendance KPIs (mainWork, sundayWork, otHours, deficitHours, duties) without salary math', () => {
      const employee: TimesheetWorkspaceEmployee = {
        id: 'emp-1',
        employeeCode: 'NV001',
        fullName: 'Nguyen Van A',
        departmentName: 'Kỹ thuật',
        workingDays: 2,
        totalDays: 31,
      };
      const records: TimesheetWorkspaceRecord[] = [
        {
          employeeId: 'emp-1',
          workDate: '2026-10-12', // Monday
          status: 'present',
          workedMinutes: 480,
          scheduledMinutes: 480,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 120,
          lunchDutyMinutes: 60,
          nightShiftDutyCount: 1,
          waterBoothDutyCount: 2,
          isHoliday: false,
          note: null,
        },
        {
          employeeId: 'emp-1',
          workDate: '2026-10-18', // Sunday
          status: 'present',
          workedMinutes: 480,
          scheduledMinutes: 0,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          isHoliday: false,
          note: null,
        },
      ];

      const stats = computeMonthStats(records, '2026-10', employee);
      expect(stats.mainWork).toBe(2);
      expect(stats.sundayWork).toBe(1);
      expect(stats.otHours).toBe(2);
      expect(stats.lunchDutyHours).toBe(1);
      expect(stats.night).toBe(1);
      expect(stats.water).toBe(2);
      expect(stats.presentDays).toBe(2);
    });
  });
});

