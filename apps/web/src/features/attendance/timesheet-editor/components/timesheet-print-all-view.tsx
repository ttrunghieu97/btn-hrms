'use client';

import * as React from 'react';
import { DAY_LABELS, dayDate, fmtDuration, fmtTime, fmtWork, getDayOfWeek } from '../detail-columns';
import { computeMonthStats } from '../kpi-summary';
import type { TimesheetWorkspaceEmployee, TimesheetWorkspaceRecord } from '../types';
import { TimesheetTableFooter } from './timesheet-table-footer';

export interface TimesheetPrintAllViewProps {
  period: string;
  employees: TimesheetWorkspaceEmployee[];
  getEmployeeRecords: (empId: string) => ReadonlyMap<string, TimesheetWorkspaceRecord>;
}

export const TimesheetPrintAllView = React.memo(function TimesheetPrintAllView({
  period,
  employees,
  getEmployeeRecords,
}: TimesheetPrintAllViewProps) {
  return (
    <div
      data-testid="print-all-timesheet-container"
      className="hidden print:block"
    >
      {employees.map((emp, idx) => {
        const recMap = getEmployeeRecords(emp.id);
        const stats = computeMonthStats(recMap, period, emp);
        const days = Array.from({ length: stats.totalDays }, (_, i) => i + 1);
        const isLast = idx === employees.length - 1;

        return (
          <section
            key={emp.id}
            data-testid="print-employee-sheet"
            data-employee-id={emp.id}
            style={{ pageBreakAfter: isLast ? 'auto' : 'always' }}
            className="mb-6"
          >
            <div className="mb-2 flex items-center justify-between border-b pb-1.5 text-xs">
              <div>
                <span className="font-bold">{emp.fullName}</span>
                <span className="text-muted-foreground ml-2">
                  ({emp.employeeCode})
                </span>
                {emp.departmentName ? (
                  <span className="text-muted-foreground ml-2">
                    • {emp.departmentName}
                  </span>
                ) : null}
              </div>
              <div className="font-medium">Kỳ công: {period}</div>
            </div>

            <table className="w-full table-fixed border-collapse border text-[11px] tabular-nums">
              <thead>
                <tr className="bg-muted border-b">
                  <th className="border px-1 py-0.5 text-center">Ngày</th>
                  <th className="border px-1 py-0.5 text-center">Thứ</th>
                  <th className="border px-1 py-0.5 text-center">Vào S</th>
                  <th className="border px-1 py-0.5 text-center">Ra S</th>
                  <th className="border px-1 py-0.5 text-center">Vào C</th>
                  <th className="border px-1 py-0.5 text-center">Ra C</th>
                  <th className="border px-1 py-0.5 text-center">Nghỉ trưa</th>
                  <th className="border px-1 py-0.5 text-center">Việc riêng</th>
                  <th className="border px-1 py-0.5 text-center">Trực trưa</th>
                  <th className="border px-1 py-0.5 text-center">Trực 35k</th>
                  <th className="border px-1 py-0.5 text-center">Giờ</th>
                  <th className="border px-1 py-0.5 text-center">Phút</th>
                  <th className="border px-1 py-0.5 text-center">Công chính</th>
                  <th className="border px-1 py-0.5 text-center">Tăng ca</th>
                  <th className="border px-1 py-0.5 text-center">Thiếu công</th>
                  <th className="border px-1 py-0.5 text-center">Trực đêm</th>
                  <th className="border px-1 py-0.5 text-center">Đứng nước</th>
                  <th className="border px-1 py-0.5 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const wd = dayDate(period, d);
                  const dow = getDayOfWeek(wd);
                  const r = recMap.get(wd);
                  const worked = Number(r?.workedMinutes) || 0;
                  const deficit =
                    worked < 240 ? worked : worked < 480 ? worked - 240 : 0;
                  const otMinutes =
                    (Number(r?.overtimeMinutes) || 0) > 0
                      ? Number(r?.overtimeMinutes)
                      : worked >= 480
                        ? worked - 480
                        : 0;
                  return (
                    <tr key={d} className="border-b">
                      <td className="border px-1 py-0.5 text-center">
                        {String(d).padStart(2, '0')}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {DAY_LABELS[dow]}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {r?.checkInMorning ? fmtTime(r.checkInMorning) : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {r?.checkOutMorning ? fmtTime(r.checkOutMorning) : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {r?.checkInAfternoon ? fmtTime(r.checkInAfternoon) : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {r?.checkOutAfternoon ? fmtTime(r.checkOutAfternoon) : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {r?.breakMinutes ? (Number(r.breakMinutes) / 60).toFixed(1) : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {r?.personalBreakMinutes
                          ? (Number(r.personalBreakMinutes) / 60).toFixed(1)
                          : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {r?.lunchDutyMinutes
                          ? (Number(r.lunchDutyMinutes) / 60).toFixed(1)
                          : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {r?.duty30kMinutes
                          ? (Number(r.duty30kMinutes) / 60).toFixed(1)
                          : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {worked > 0 ? Math.floor(worked / 60) : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {worked > 0 ? String(worked % 60).padStart(2, '0') : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {fmtWork(worked)}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {otMinutes > 0 ? fmtDuration(otMinutes) : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {deficit > 0 ? fmtDuration(deficit) : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {Number(r?.nightShiftDutyCount) > 0
                          ? r?.nightShiftDutyCount
                          : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        {Number(r?.waterBoothDutyCount) > 0
                          ? r?.waterBoothDutyCount
                          : '—'}
                      </td>
                      <td className="border px-1 py-0.5 text-left">
                        {r?.note || ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <TimesheetTableFooter stats={stats} />
            </table>
          </section>
        );
      })}
    </div>
  );
});
