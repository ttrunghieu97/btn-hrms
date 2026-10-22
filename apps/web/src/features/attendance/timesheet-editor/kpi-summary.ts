// Pure monthly KPI derivation for one employee's detail sheet.
// Công/giờ counts only — no salary math (payroll engine owns pay).

import type { TimesheetWorkspaceEmployee, TimesheetWorkspaceRecord } from './types';
import { dayDate, getDayOfWeek } from './detail-columns';

export interface MonthStats {
  totalDays: number;          // days in period
  presentDays: number;        // rows with any data / counted days
  mainWork: number;           // công chính (chuẩn 8h, tính cả ngày thường & CN)
  sundayWork: number;         // công chủ nhật (làm ngày CN)
  breakHours: number;         // tổng giờ nghỉ trưa
  personalBreakHours: number; // tổng giờ việc riêng
  lunchDutyHours: number;     // tổng giờ trực trưa (25k)
  duty30kHours: number;       // tổng giờ trực 35k (duty30kMinutes in DB)
  duty35kHours: number;       // tổng giờ trực 35k
  noon35: number;             // trực trưa count
  noon30: number;             // symmetry
  night: number;              // trực đêm count (nightShiftDutyCount)
  water: number;              // công đứng nước count (waterBoothDutyCount)
  otHours: number;            // tổng giờ tăng ca
  deficitHours: number;       // không đủ công: thời gian làm dở dang < 4h hoặc 4h-8h
  totHours: number;           // tổng giờ làm (workedMinutes)
  totWorkedMinutes: number;   // tổng số phút làm nguyên (workedMinutes)
  workdays: number;           // mainWork
  chuyenCan: boolean;         // chuyên cần: đủ >= 26 ngày tròn 1 công
  fullCongDays: number;       // số ngày đạt tròn 1 công (>= 8h)
}

export function computeMonthStats(
  records:
    | TimesheetWorkspaceRecord[]
    | ReadonlyMap<string, TimesheetWorkspaceRecord>,
  period: string,
  emp?: TimesheetWorkspaceEmployee,
): MonthStats {
  const totalDays = daysInPeriod(period);
  let byDate: ReadonlyMap<string, TimesheetWorkspaceRecord>;
  if (Array.isArray(records)) {
    const map = new Map<string, TimesheetWorkspaceRecord>();
    for (let i = 0; i < records.length; i++) {
      const rec = records[i]!;
      if (!emp || rec.employeeId === emp.id) {
        map.set(rec.workDate, rec);
      }
    }
    byDate = map;
  } else {
    byDate = records;
  }

  const s: MonthStats = {
    totalDays,
    presentDays: 0,
    mainWork: 0,
    sundayWork: 0,
    breakHours: 0,
    personalBreakHours: 0,
    lunchDutyHours: 0,
    duty30kHours: 0,
    duty35kHours: 0,
    noon35: 0,
    noon30: 0,
    night: 0,
    water: 0,
    otHours: 0,
    deficitHours: 0,
    totHours: 0,
    totWorkedMinutes: 0,
    workdays: 0,
    chuyenCan: false,
    fullCongDays: 0,
  };

  let fullCongDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const wd = dayDate(period, d);
    const dow = getDayOfWeek(wd);
    const r = byDate.get(wd);

    if (!r) continue;

    const workedMins = Number(r.workedMinutes) || 0;
    const breakMins = Number(r.breakMinutes) || 0;
    const personalMins = Number(r.personalBreakMinutes) || 0;
    const lunchMins = Number(r.lunchDutyMinutes) || 0;
    const duty35Mins = Number(r.duty30kMinutes) || 0;

    s.breakHours += breakMins / 60;
    s.personalBreakHours += personalMins / 60;
    s.lunchDutyHours += lunchMins / 60;
    s.duty30kHours += duty35Mins / 60;
    s.duty35kHours += duty35Mins / 60;

    if (lunchMins > 0) s.noon35++;
    s.night += Number(r.nightShiftDutyCount) || 0;
    s.water += Number(r.waterBoothDutyCount) || 0;
    s.totWorkedMinutes += Math.round(workedMins);
    s.totHours = s.totWorkedMinutes / 60;

    if (workedMins > 0) {
      s.presentDays++;
    }

    // Bậc thang tính công hàng ngày:
    // < 4h (240p): tính 0 công -> thời gian ghi vào thiếu công
    // 4h <= giờ < 8h (480p): tính 0.5 công, thời gian thừa sau 4h ghi vào thiếu công
    // >= 8h: tính 1.0 công, thời gian thừa sau 8h ghi vào tăng ca
    let dayCong = 0;
    let dayDeficitMins = 0;
    let dayOtMins = 0;

    if (workedMins < 240) {
      dayCong = 0;
      dayDeficitMins = workedMins;
      dayOtMins = 0;
    } else if (workedMins < 480) {
      dayCong = 0.5;
      dayDeficitMins = workedMins - 240;
      dayOtMins = 0;
    } else {
      dayCong = 1.0;
      dayDeficitMins = 0;
      dayOtMins = workedMins - 480;
    }

    const finalOtMins = r.overtimeMinutes != null && r.overtimeMinutes > 0
      ? Number(r.overtimeMinutes)
      : dayOtMins;

    s.otHours += finalOtMins / 60;
    s.deficitHours += dayDeficitMins / 60;

    if (dow === 0) {
      // Chủ nhật: tính vào công chính VÀ tính vào công Chủ nhật
      s.mainWork += dayCong;
      s.sundayWork += dayCong;
    } else {
      s.mainWork += dayCong;
    }

    if (dayCong >= 1.0) {
      fullCongDays++;
    }
  }

  s.workdays = s.mainWork;
  s.fullCongDays = fullCongDays;
  // Chuyên cần: đủ từ 26 ngày đạt tròn 1 công trở lên
  s.chuyenCan = fullCongDays >= 26;

  return s;
}

function daysInPeriod(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(y!, m!, 0).getDate();
}
