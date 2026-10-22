import {
  applyDayPatchToRecord,
  calculateWorkedMinutesFromPunches,
  normalizeEmployeeRecord,
  resolvePatchedAttendanceStatus,
} from './detail-sheet';
import {
  ORDERED_FIELDS,
  getNextCell,
  getVisualColDisplayValue,
  normalizeTimeString,
  parseRawCellValueToUpdates,
} from '../timesheet-calculations';
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

    it('does not auto-deduct 90 minutes when breakMinutes is null on a single full-day span', () => {
      // 07:30 to 17:00 = 570 mins with no auto lunch deduction when breakMinutes is not entered
      const worked = calculateWorkedMinutesFromPunches({
        checkInMorning: '07:30',
        checkOutMorning: null,
        checkInAfternoon: null,
        checkOutAfternoon: '17:00',
        breakMinutes: null,
      });

      expect(worked).toBe(570);
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
        checkIn: null,
        checkOut: null,
        workedMinutes: 0,
        scheduledMinutes: 480,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        personalBreakMinutes: 0,
        lunchDutyMinutes: 0,
        nightShiftDutyCount: 0,
        waterBoothDutyCount: 0,
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

    it('does not leak checkOutMorning into checkOutAfternoon when editing morning check-out', () => {
      const step1 = applyDayPatchToRecord(
        undefined,
        'emp-1',
        '2026-10-16',
        false,
        { checkInMorning: '08:00', checkOutMorning: '12:00' },
      );

      expect(step1.checkOutMorning).toBe('12:00');
      expect(step1.checkOutAfternoon).toBeNull();

      // Subsequent edit on the same day must not copy step1.checkOut ('12:00') into checkOutAfternoon
      const step2 = applyDayPatchToRecord(
        step1,
        'emp-1',
        '2026-10-16',
        false,
        { note: 'Làm nửa ngày sáng' },
      );

      expect(step2.checkOutMorning).toBe('12:00');
      expect(step2.checkOutAfternoon).toBeNull();
    });

    it('calculates 8h20p (500 mins) instead of 4h20p (260 mins) when morning punches are ISO timestamps from server (7:30-11:30) and afternoon punches are edited (13:30-17:50)', () => {
      const morningIsoIn = new Date('2026-10-02T07:30:00').toISOString();
      const morningIsoOut = new Date('2026-10-02T11:30:00').toISOString();
      const serverRecord: TimesheetWorkspaceRecord = {
        employeeId: 'emp-1',
        workDate: '2026-10-02',
        status: 'present',
        checkIn: morningIsoIn,
        checkOut: morningIsoOut,
        checkInMorning: morningIsoIn,
        checkOutMorning: morningIsoOut,
        checkInAfternoon: null,
        checkOutAfternoon: null,
        workedMinutes: 240,
        scheduledMinutes: 480,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        personalBreakMinutes: 0,
        lunchDutyMinutes: 0,
        nightShiftDutyCount: 0,
        waterBoothDutyCount: 0,
        isHoliday: false,
        note: null,
      };

      const afterInA = applyDayPatchToRecord(
        serverRecord,
        'emp-1',
        '2026-10-02',
        false,
        { checkInAfternoon: '13:30' },
      );
      const afterOutA = applyDayPatchToRecord(
        afterInA,
        'emp-1',
        '2026-10-02',
        false,
        { checkOutAfternoon: '17:50' },
      );

      expect(afterOutA.workedMinutes).toBe(500); // 4h00p (240m) + 4h20p (260m) = 8h20p (500m)
      expect(afterOutA.overtimeMinutes).toBe(20);
    });

    it('treats Sunday as a normal working day instead of weekly off or holiday', () => {
      const sundayZeroWork = applyDayPatchToRecord(
        undefined,
        'emp-1',
        '2026-10-18', // Sunday
        true,
        { note: '' },
      );

      expect(sundayZeroWork.status).toBe('absent');
      expect(sundayZeroWork.isHoliday).toBe(false);
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
        completionRate: 100,
        lateCount: 0,
        leaveCount: 0,
        absentCount: 0,
        otMinutes: 120,
        workedMinutes: 960,
        verificationStatus: 'draft',
      };
      const records: TimesheetWorkspaceRecord[] = [
        {
          employeeId: 'emp-1',
          workDate: '2026-10-12', // Monday
          status: 'present',
          checkIn: null,
          checkOut: null,
          workedMinutes: 480,
          scheduledMinutes: 480,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 120,
          personalBreakMinutes: 0,
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
          checkIn: null,
          checkOut: null,
          workedMinutes: 480,
          scheduledMinutes: 0,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          personalBreakMinutes: 0,
          lunchDutyMinutes: 0,
          nightShiftDutyCount: 0,
          waterBoothDutyCount: 0,
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

      const indexedMap = new Map(records.map((r) => [r.workDate, r]));
      const statsFromMap = computeMonthStats(indexedMap, '2026-10', employee);
      expect(statsFromMap).toEqual(stats);
    });
  });

  describe('editable columns and keyboard navigation across formula columns', () => {
    it('excludes workedHours, congChinh, and otHours from ORDERED_FIELDS and jumps from duty30kHours to nightShift', () => {
      expect(ORDERED_FIELDS).toEqual([
        'checkInMorning',
        'checkOutMorning',
        'checkInAfternoon',
        'checkOutAfternoon',
        'breakHours',
        'personalBreakHours',
        'lunchDutyHours',
        'duty30kHours',
        'nightShift',
        'waterBooth',
        'note',
      ]);
      expect(
        getNextCell({ day: 5, field: 'duty30kHours' }, 'right', 31),
      ).toEqual({
        day: 5,
        field: 'nightShift',
      });
      expect(
        getNextCell({ day: 5, field: 'nightShift' }, 'left', 31),
      ).toEqual({
        day: 5,
        field: 'duty30kHours',
      });
    });
  });

  describe('normalizeTimeString & parseRawCellValueToUpdates (AUD-02 & AUD-12)', () => {
    it('rejects out-of-range or malformed time strings while normalizing valid formats', () => {
      expect(normalizeTimeString('25:00')).toBeNull();
      expect(normalizeTimeString('08:75')).toBeNull();
      expect(normalizeTimeString('9999')).toBeNull();
      expect(normalizeTimeString('::')).toBeNull();
      expect(normalizeTimeString('abc')).toBeNull();
      expect(normalizeTimeString('')).toBeNull();

      expect(normalizeTimeString('730')).toBe('07:30');
      expect(normalizeTimeString('08:00:00')).toBe('08:00');
      expect(normalizeTimeString('23:59')).toBe('23:59');
      expect(normalizeTimeString('00:00')).toBe('00:00');
    });

    it('enforces upper/integer bounds in parseRawCellValueToUpdates', () => {
      expect(parseRawCellValueToUpdates('checkInMorning', '25:00')).toBeNull();
      expect(parseRawCellValueToUpdates('breakHours', '25')).toBeNull();
      expect(parseRawCellValueToUpdates('breakHours', '-1')).toBeNull();
      expect(parseRawCellValueToUpdates('nightShift', '11')).toBeNull();
      expect(parseRawCellValueToUpdates('nightShift', '1.5')).toBeNull();
      expect(parseRawCellValueToUpdates('waterBooth', '2.5')).toBeNull();

      expect(parseRawCellValueToUpdates('breakHours', '1.5')).toEqual({
        breakMinutes: 90,
      });
      expect(parseRawCellValueToUpdates('nightShift', '2')).toEqual({
        nightShiftDutyCount: 2,
      });
    });
  });

  describe('normalizeEmployeeRecord & summary-only records (AUD-05 & AUD-09)', () => {
    it('clears stale overtimeMinutes when normalizeEmployeeRecord recalculates workedMinutes < 480', () => {
      const normalized = normalizeEmployeeRecord({
        employeeId: 'emp-1',
        workDate: '2026-10-03',
        status: 'present',
        checkIn: null,
        checkOut: null,
        checkInMorning: '08:00',
        checkOutMorning: '12:00',
        checkInAfternoon: null,
        checkOutAfternoon: null,
        workedMinutes: 540, // stale
        scheduledMinutes: 480,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 60, // stale
        personalBreakMinutes: 0,
        lunchDutyMinutes: 0,
        breakMinutes: 0,
        duty30kMinutes: 0,
        nightShiftDutyCount: 0,
        waterBoothDutyCount: 0,
        isHoliday: false,
      });

      expect(normalized.workedMinutes).toBe(240);
      expect(normalized.overtimeMinutes).toBe(0);
    });

    it('preserves summary-only workedMinutes when editing break/duty fields without punch times', () => {
      const summaryOnlyRecord: TimesheetWorkspaceRecord = {
        employeeId: 'emp-1',
        workDate: '2026-10-04',
        status: 'present',
        checkIn: null,
        checkOut: null,
        checkInMorning: null,
        checkOutMorning: null,
        checkInAfternoon: null,
        checkOutAfternoon: null,
        workedMinutes: 480,
        scheduledMinutes: 480,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        personalBreakMinutes: 0,
        lunchDutyMinutes: 0,
        breakMinutes: 0,
        duty30kMinutes: 0,
        nightShiftDutyCount: 0,
        waterBoothDutyCount: 0,
        isHoliday: false,
        note: null,
      };

      const patched = applyDayPatchToRecord(
        summaryOnlyRecord,
        'emp-1',
        '2026-10-04',
        false,
        { lunchDutyMinutes: 60 },
      );

      expect(patched.workedMinutes).toBe(480);
      expect(patched.lunchDutyMinutes).toBe(60);
    });

    it('accumulates exact integer totWorkedMinutes in computeMonthStats and formats formula columns for clipboard copy', () => {
      const records: TimesheetWorkspaceRecord[] = Array.from(
        { length: 9 },
        (_, idx) => ({
          employeeId: 'emp-1',
          workDate: `2026-10-0${idx + 1}`,
          status: 'present',
          checkIn: null,
          checkOut: null,
          workedMinutes: 490, // 8h10p each -> 9 * 490 = 4410 mins = 73h30p
          scheduledMinutes: 480,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 10,
          personalBreakMinutes: 0,
          lunchDutyMinutes: 0,
          nightShiftDutyCount: 0,
          waterBoothDutyCount: 0,
          isHoliday: false,
        }),
      );

      const stats = computeMonthStats(records, '2026-10');
      expect(stats.totWorkedMinutes).toBe(4410);
      expect(Math.floor(stats.totWorkedMinutes / 60)).toBe(73);
      expect(stats.totWorkedMinutes % 60).toBe(30);

      expect(getVisualColDisplayValue(records[0], 8)).toBe('8');
      expect(getVisualColDisplayValue(records[0], 9)).toBe('10');
      expect(getVisualColDisplayValue(records[0], 10)).toBe('1');
    });
  });
});

