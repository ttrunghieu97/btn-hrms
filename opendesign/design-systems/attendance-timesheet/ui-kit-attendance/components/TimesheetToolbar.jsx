import React from 'react';
import { Button } from './Button';
import { Badge } from './Badge';

export function TimesheetToolbar({
  period,
  canEdit = true,
  onNavigatePeriod,
  onClosePeriod,
  onExportExcel,
  onExportPdf,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-[var(--fg-2)] hover:text-[var(--fg-1)] cursor-pointer">
            Quản lý kỳ công
          </span>
          <span className="text-[var(--fg-3)] text-xs">/</span>
          <span className="text-xs text-[var(--fg-2)] font-mono">Chi tiết tháng {period}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-[var(--fg-1)]">
            Bảng công tháng {period}
          </h1>
          {canEdit ? (
            <Badge variant="ok" className="gap-1 py-0.5 text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đang mở
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 py-0.5 text-xs font-medium">
              Đã chốt kỳ
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Period Navigation */}
        <div className="flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] p-0.5 shadow-2xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onNavigatePeriod(-1)}
          >
            ← Trước
          </Button>
          <div className="flex items-center gap-1.5 px-2 font-mono text-xs font-bold text-[var(--fg-1)]">
            <span>{period}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onNavigatePeriod(1)}
          >
            Sau →
          </Button>
        </div>

        {/* Actions */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onExportExcel}
        >
          Excel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onExportPdf}
        >
          In / PDF
        </Button>

        {canEdit && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-8 gap-1.5 text-xs shadow-2xs font-semibold"
            onClick={onClosePeriod}
          >
            Chốt bảng công
          </Button>
        )}
      </div>
    </div>
  );
}
