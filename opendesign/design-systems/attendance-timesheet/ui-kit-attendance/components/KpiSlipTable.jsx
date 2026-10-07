import React from 'react';

/**
 * KPI Slip Table component matching Untitled.png specification
 * Redesigned with clean minimal shadcn/ui Zinc tokens.
 * Multi-column grid across exactly 2 rows for timesheet payroll KPIs.
 */
export function KpiSlipTable({
  employeeName = "Lifecycle Test831202",
  employeeCode = "LV831202",
  departmentName = "Chưa gán phòng ban",
  baseSalary = 0,
  ratePerDay = 350000,
  statusText = "Thiếu dữ liệu",
  statusType = "warn",
  mainWorkCount = 26,
  mainWorkAmount = 9100000,
  sundayWorkCount = 0,
  sundayWorkAmount = 0,
  noon35Count = 0,
  noon35Amount = 0,
  responsibilityAmount = 0,
  chuyenCanAmount = 500000,
  otHours = 0,
  otAmount = 0,
  deficitHours = 0,
  deficitAmount = 0,
  nightShiftCount = 14,
  nightShiftAmount = 1400000,
  insuranceUnionAmount = 533000,
  totalNetSalary = 10467000,
  onToggleSidebar,
  onExportExcel,
  onPrintPdf,
  onLockPeriod,
}) {
  const formatVND = (num) => new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--fg-1)] shadow-2xs">
      {/* Profile Bar Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-header)] border-b border-[var(--border-subtle)] text-xs flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border border-[var(--border-subtle)] rounded hover:bg-[var(--surface-subtle)] font-medium"
            >
              ☰ Thu gọn
            </button>
          )}
          <div className="inline-flex items-center gap-1">
            <span className="text-[var(--fg-3)] font-medium">Tên nhân viên:</span>
            <span className="font-semibold text-[var(--fg-1)]">{employeeName}</span>
            <span className="font-mono text-[10.5px] px-1.5 py-0.5 bg-[var(--surface-subtle)] rounded text-[var(--fg-2)] border border-[var(--border-subtle)]">
              {employeeCode}
            </span>
          </div>
          <span className="text-[var(--border-medium)]">·</span>
          <div className="inline-flex items-center gap-1">
            <span className="text-[var(--fg-3)] font-medium">Bộ phận:</span>
            <span className="text-[var(--fg-1)]">{departmentName}</span>
          </div>
          <span className="text-[var(--border-medium)]">·</span>
          <div className="inline-flex items-center gap-1">
            <span className="text-[var(--fg-3)] font-medium">LCB:</span>
            <span className="font-mono text-[var(--fg-1)]">{formatVND(baseSalary)}</span>
          </div>
          <span className="text-[var(--border-medium)]">·</span>
          <div className="inline-flex items-center gap-1">
            <span className="text-[var(--fg-3)] font-medium">Đơn giá/ngày:</span>
            <span className="font-mono font-semibold text-[var(--fg-1)]">{formatVND(ratePerDay)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
            statusType === 'warn'
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
          }`}>
            {statusText}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Đã tự động lưu
          </span>
          <div className="inline-flex items-center gap-1">
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border border-[var(--border-subtle)] rounded bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] font-medium"
              title="Xuất Excel"
            >
              📥 Excel
            </button>
            <button
              onClick={onPrintPdf}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border border-[var(--border-subtle)] rounded bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] font-medium"
              title="In / PDF"
            >
              🖨️ In / PDF
            </button>
            <button
              onClick={onLockPeriod}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded bg-[var(--accent-1)] text-white hover:bg-[var(--accent-1-hover)] font-semibold"
              title="Chốt kỳ công"
            >
              🔒 Chốt
            </button>
          </div>
        </div>
      </div>

      {/* 2-Row Multi-Column KPI Slip Grid matching Untitled.png */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs whitespace-nowrap table-fixed min-w-[1038px]">
          <colgroup>
            <col style={{ width: '98px' }} />
            <col style={{ width: '44px' }} />
            <col style={{ width: '86px' }} />
            <col style={{ width: '98px' }} />
            <col style={{ width: '44px' }} />
            <col style={{ width: '58px' }} />
            <col style={{ width: '96px' }} />
            <col style={{ width: '52px' }} />
            <col style={{ width: '94px' }} />
            <col style={{ width: '104px' }} />
            <col style={{ width: '82px' }} />
            <col style={{ width: '86px' }} />
            <col style={{ width: '96px' }} />
          </colgroup>
          <tbody>
            {/* Dòng 1: Công chính -> Công Chủ nhật -> Trực trưa 35K -> Trách nhiệm -> Chuyên cần */}
            <tr className="border-b border-[var(--border-subtle)]">
              <td className="px-2 py-1.5 font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] border-r border-[var(--border-subtle)]">Công chính:</td>
              <td className="px-2 py-1.5 font-mono font-semibold text-right border-r border-[var(--border-subtle)]">{mainWorkCount.toFixed(2)}</td>
              <td className="px-2 py-1.5 font-mono font-semibold text-right border-r border-[var(--border-subtle)]">{formatVND(mainWorkAmount)}</td>

              <td className="px-2 py-1.5 font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] border-r border-[var(--border-subtle)]">Công Chủ nhật:</td>
              <td className="px-2 py-1.5 font-mono font-semibold text-right border-r border-[var(--border-subtle)]">{sundayWorkCount.toFixed(2)}</td>
              <td className="px-2 py-1.5 font-mono text-right border-r border-[var(--border-subtle)]">{formatVND(sundayWorkAmount)}</td>

              <td className="px-2 py-1.5 font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] border-r border-[var(--border-subtle)]">Trực trưa 35K:</td>
              <td className="px-2 py-1.5 font-mono text-right border-r border-[var(--border-subtle)]">{noon35Count.toFixed(2)}</td>
              <td className="px-2 py-1.5 font-mono text-right border-r border-[var(--border-subtle)]">{formatVND(noon35Amount)}</td>

              <td className="px-2 py-1.5 font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] border-r border-[var(--border-subtle)]">Trách nhiệm:</td>
              <td className="px-2 py-1.5 font-mono text-right border-r border-[var(--border-subtle)]">{formatVND(responsibilityAmount)}</td>

              <td className="px-2 py-1.5 font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-r border-[var(--border-subtle)]">Chuyên cần:</td>
              <td className="px-2 py-1.5 font-mono font-bold text-right bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">+{formatVND(chuyenCanAmount)}</td>
            </tr>

            {/* Dòng 2: Giờ tăng ca -> Không đủ công -> Công trực đêm -> BH + Công đoàn -> Tổng */}
            <tr>
              <td className="px-2 py-1.5 font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] border-r border-[var(--border-subtle)]">Giờ tăng ca (giờ):</td>
              <td className="px-2 py-1.5 font-mono font-semibold text-right border-r border-[var(--border-subtle)]">{otHours.toFixed(1)}h</td>
              <td className="px-2 py-1.5 font-mono text-right border-r border-[var(--border-subtle)]">{formatVND(otAmount)}</td>

              <td className="px-2 py-1.5 font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] border-r border-[var(--border-subtle)]">Không đủ công:</td>
              <td className="px-2 py-1.5 font-mono text-right text-rose-600 border-r border-[var(--border-subtle)]">{deficitHours}h</td>
              <td className="px-2 py-1.5 font-mono text-right text-rose-600 border-r border-[var(--border-subtle)]">{formatVND(deficitAmount)}</td>

              <td className="px-2 py-1.5 font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] border-r border-[var(--border-subtle)]">Công trực đêm:</td>
              <td className="px-2 py-1.5 font-mono font-medium text-emerald-700 dark:text-emerald-400 text-right border-r border-[var(--border-subtle)]">{nightShiftCount} đêm</td>
              <td className="px-2 py-1.5 font-mono font-semibold text-emerald-700 dark:text-emerald-400 text-right border-r border-[var(--border-subtle)]">+{formatVND(nightShiftAmount)}</td>

              <td className="px-2 py-1.5 font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] border-r border-[var(--border-subtle)]">BH + Công đoàn:</td>
              <td className="px-2 py-1.5 font-mono text-rose-600 font-medium text-right border-r border-[var(--border-subtle)]">-{formatVND(insuranceUnionAmount)}</td>

              <td className="px-2 py-1.5 font-bold uppercase bg-[var(--surface-subtle)] text-[var(--fg-1)] border-r border-[var(--border-subtle)]">Tổng:</td>
              <td className="px-2 py-1.5 font-mono font-extrabold text-right bg-[var(--surface-subtle)] text-[var(--fg-1)]">{formatVND(totalNetSalary)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
