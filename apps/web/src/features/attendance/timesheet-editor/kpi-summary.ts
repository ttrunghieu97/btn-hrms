// Pure monthly KPI derivation for one employee's detail sheet.
// Công/giờ counts only — no salary math (payroll engine owns pay).

import type { TimesheetWorkspaceEmployee, TimesheetWorkspaceRecord } from './types';
import { dayDate, getDayOfWeek } from './detail-columns';

export interface MonthStats {
  totalDays: number;        // days in period
  presentDays: number;      // rows with any data / counted days
  mainWork: number;         // công chính (chuẩn 8h, tính cả ngày thường & CN)
  sundayWork: number;       // công chủ nhật (làm ngày CN để x2)
  breakHours: number;       // tổng giờ nghỉ trưa
  personalBreakHours: number; // tổng giờ việc riêng
  lunchDutyHours: number;   // tổng giờ trực trưa (25k)
  duty30kHours: number;     // tổng giờ trực 35k (duty30kMinutes in DB)
  duty35kHours: number;     // tổng giờ trực 35k
  noon35: number;           // trực trưa count
  noon30: number;           // symmetry
  night: number;            // trực đêm count (nightShiftDutyCount)
  water: number;            // công đứng nước count (waterBoothDutyCount)
  otHours: number;          // tổng giờ tăng ca
  deficitHours: number;     // không đủ công: thời gian làm dở dang < 4h hoặc 4h-8h
  totHours: number;         // tổng giờ làm (workedMinutes)
  workdays: number;         // mainWork
  responsibilityAllowance: number; // phụ cấp trách nhiệm
  insuranceUnionRate: number;      // 10.5%
  insuranceUnionAmount: number;    // số tiền khấu trừ
  chuyenCan: boolean;              // chuyên cần: đủ >= 26 ngày tròn 1 công
  chuyenCanAmount: number;         // mức thưởng chuyên cần (500.000 đ)
  fullCongDays: number;            // số ngày đạt tròn 1 công (>= 8h)
  // Slip fields matching client specification:
  baseSalary: number;               // LCB
  ratePerDay: number;               // Ngày công (LCB / 26)
  mainWorkAmount: number;           // mainWork * ratePerDay
  sundayWorkAmount: number;         // sundayWork * ratePerDay
  noon25Amount: number;             // lunchDutyHours * 25.000 đ
  noon35Amount: number;             // duty35kHours * 35.000 đ
  nightAmount: number;              // night * 150.000 đ
  waterAmount: number;              // 0 đ (chờ logic sau)
  otAmount: number;                 // otHours * 25.000 đ
  deficitAmount: number;            // deficitHours * (ratePerDay / 8) -> CỘNG
  responsibilityAmount: number;     // phụ cấp trách nhiệm/chức vụ
  insuranceUnionSlipAmount: number; // 10.5% * LCB + 50k
  totalNetSalary: number;           // Tổng thực lĩnh
}

export const DEPARTMENT_RESPONSIBILITY_ALLOWANCE: Record<string, number> = {
  'Kỹ thuật': 1_000_000,
  'Kinh doanh': 800_000,
  'Kế toán': 1_200_000,
  'Nhân sự': 800_000,
  'Hành chính': 500_000,
  'Vận hành': 700_000,
  'Kho vận': 500_000,
  'Bảo vệ': 300_000,
};

export const DEFAULT_BASE_SALARY = 5_000_000;
export const STATUTORY_INSURANCE_RATE = 0.105; // 10.5% (8% BHXH + 1.5% BHYT + 1% BHTN)
export const CHUYEN_CAN_BONUS_STANDARD = 500_000;

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

export function computeMonthStats(
  records: TimesheetWorkspaceRecord[],
  period: string,
  emp: TimesheetWorkspaceEmployee,
): MonthStats {
  const totalDays = daysInPeriod(period);
  const byDate = new Map(records.filter((r) => r.employeeId === emp.id).map((r) => [r.workDate, r]));

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
    workdays: 0,
    responsibilityAllowance: 0,
    insuranceUnionRate: STATUTORY_INSURANCE_RATE,
    insuranceUnionAmount: 0,
    chuyenCan: false,
    chuyenCanAmount: 0,
    fullCongDays: 0,
    baseSalary: 0,
    ratePerDay: 0,
    mainWorkAmount: 0,
    sundayWorkAmount: 0,
    noon25Amount: 0,
    noon35Amount: 0,
    nightAmount: 0,
    waterAmount: 0,
    otAmount: 0,
    deficitAmount: 0,
    responsibilityAmount: 0,
    insuranceUnionSlipAmount: 0,
    totalNetSalary: 0,
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
    s.totHours += workedMins / 60;

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
  s.chuyenCanAmount = s.chuyenCan ? CHUYEN_CAN_BONUS_STANDARD : 0;

  // LCB derived dynamically from employee's active salary structure (or 0 if unassigned)
  const rawBase = emp.baseSalary != null ? Number(emp.baseSalary) : 0;
  const baseSalary = rawBase > 0 && rawBase < 50_000 ? rawBase * 1000 : rawBase;
  const standardDailyRate = 250_000;
  const ratePerDay = baseSalary > 0 ? Math.round(baseSalary / 26) : standardDailyRate;

  s.baseSalary = baseSalary;
  s.ratePerDay = ratePerDay;

  // Tiền các khoản:
  s.mainWorkAmount = Math.round(s.mainWork * ratePerDay);
  s.sundayWorkAmount = Math.round(s.sundayWork * ratePerDay);
  s.noon25Amount = Math.round(s.lunchDutyHours * 25_000);
  s.noon35Amount = Math.round(s.duty35kHours * 35_000);
  s.nightAmount = Math.round(s.night * 150_000);
  s.waterAmount = 0; // Đứng nước tạm thời 0 đ chờ logic sau
  s.otAmount = Math.round(s.otHours * 25_000);
  s.deficitAmount = Math.round(s.deficitHours * (ratePerDay / 8));

  s.responsibilityAmount = emp.responsibilityAllowance != null
    ? (Number(emp.responsibilityAllowance) < 10_000 ? Number(emp.responsibilityAllowance) * 1000 : Number(emp.responsibilityAllowance))
    : (emp.departmentName ? (DEPARTMENT_RESPONSIBILITY_ALLOWANCE[emp.departmentName] ?? 0) : 0);

  // BH + Công đoàn = 10.5% LCB + 50.000 đ
  s.insuranceUnionSlipAmount = baseSalary > 0
    ? Math.round(baseSalary * STATUTORY_INSURANCE_RATE + 50_000)
    : 0;

  // TỔNG THỰC LĨNH = Công chính + Công Chủ nhật + Trực trưa (25k) + Trực 35k + Trực đêm (150k) + Đứng nước + Tăng ca (25k) + Không đủ công + Trách nhiệm + Chuyên cần - (BH + Công đoàn)
  s.totalNetSalary = Math.max(
    0,
    s.mainWorkAmount +
      s.sundayWorkAmount +
      s.noon25Amount +
      s.noon35Amount +
      s.nightAmount +
      s.waterAmount +
      s.otAmount +
      s.deficitAmount +
      s.responsibilityAmount +
      s.chuyenCanAmount -
      s.insuranceUnionSlipAmount,
  );

  return s;
}

function daysInPeriod(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(y!, m!, 0).getDate();
}
