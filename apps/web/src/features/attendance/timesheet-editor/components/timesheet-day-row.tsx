'use client';

import * as React from 'react';
import { DAY_LABELS, fmtDuration, fmtWork } from '../detail-columns';
import type { ActiveCell, EditableField } from '../timesheet-calculations';
import type { TimesheetWorkspaceRecord } from '../types';
import {
  EditableNoteCell,
  EditableNumberCell,
  EditableTimeCell,
  type NumberCellField,
  type TimeCellField,
} from './editable-cells';

export interface TimesheetDayRowProps {
  day: number;
  wd: string;
  dow: number;
  record: TimesheetWorkspaceRecord | undefined;
  canEdit: boolean;
  totalDays: number;
  rowActiveField: EditableField | null;
  rowAnchorCol: number;
  selMinCol: number;
  selMaxCol: number;
  selRowEdge: 'top' | 'middle' | 'bottom' | 'single' | null;
  showFillHandle: boolean;
  dayDirtyFields: EditableField[] | undefined;
  fillMinCol: number;
  fillMaxCol: number;
  fillDragEdge: 'top' | 'middle' | 'bottom' | 'single' | null;
  setActiveCell: (cell: ActiveCell | null) => void;
  onHoverDay: (day: number) => void;
  onRowHeaderMouseDown: (day: number, shiftKey: boolean) => void;
  onCellMouseDown: (
    day: number,
    visualCol: number,
    shiftKey: boolean,
    isTargetInput: boolean,
  ) => void;
  onCellMouseEnter: (day: number, visualCol: number) => void;
  onCommitTime: (day: number, field: TimeCellField, val: string | null) => void;
  onCommitNumber: (day: number, field: NumberCellField, num: number) => void;
  onCommitNote: (day: number, val: string) => void;
  onPasteBlock: (day: number, field: EditableField, rawText: string) => void;
  onStartFillDrag: (day: number, field: EditableField) => void;
}

export const TimesheetDayRow = React.memo(function TimesheetDayRow({
  day,
  dow,
  record: r,
  canEdit,
  totalDays,
  rowActiveField,
  rowAnchorCol,
  selMinCol,
  selMaxCol,
  selRowEdge,
  showFillHandle,
  dayDirtyFields,
  fillMinCol,
  fillMaxCol,
  fillDragEdge,
  setActiveCell,
  onHoverDay,
  onRowHeaderMouseDown,
  onCellMouseDown,
  onCellMouseEnter,
  onCommitTime,
  onCommitNumber,
  onCommitNote,
  onPasteBlock,
  onStartFillDrag,
}: TimesheetDayRowProps) {
  const worked = Number(r?.workedMinutes) || 0;
  const isSun = dow === 0;
  const cong = worked < 240 ? 0 : worked < 480 ? 0.5 : 1.0;
  const deficit = worked < 240 ? worked : worked < 480 ? worked - 240 : 0;
  const otMinutes =
    (Number(r?.overtimeMinutes) || 0) > 0
      ? Number(r?.overtimeMinutes)
      : worked >= 480
        ? worked - 480
        : 0;
  const isRowActive = rowAnchorCol >= 0 || selMinCol >= 0;
  const isSingleSelection =
    selRowEdge === 'single' && selMinCol >= 0 && selMinCol === selMaxCol;
  const isMultiSelected = selMinCol >= 0 && !isSingleSelection;

  const tdCls = (base: string, visualCol: number, f?: EditableField) => {
    let cls = base;
    const isSelected =
      selMinCol >= 0 && visualCol >= selMinCol && visualCol <= selMaxCol;
    if (isSelected) {
      if (isSingleSelection && visualCol === rowAnchorCol) {
        cls += ' excel-active-cell';
      } else {
        cls += ' excel-range-cell';
        cls +=
          visualCol === rowAnchorCol
            ? ' excel-range-anchor'
            : ' excel-range-tinted';
        if (selRowEdge === 'top' || selRowEdge === 'single') {
          cls += ' excel-range-top';
        }
        if (selRowEdge === 'bottom' || selRowEdge === 'single') {
          cls += ' excel-range-bottom';
        }
        if (visualCol === selMinCol) cls += ' excel-range-left';
        if (visualCol === selMaxCol) cls += ' excel-range-right';
      }
    }
    if (f && dayDirtyFields && dayDirtyFields.includes(f)) {
      cls += ' excel-cell-dirty';
    }
    if (
      fillMinCol >= 0 &&
      visualCol >= fillMinCol &&
      visualCol <= fillMaxCol
    ) {
      cls += ' excel-fill-range';
      if (fillDragEdge === 'top' || fillDragEdge === 'single') {
        cls += ' excel-fill-range-top';
      }
      if (fillDragEdge === 'bottom' || fillDragEdge === 'single') {
        cls += ' excel-fill-range-bottom';
      }
      if (visualCol === fillMinCol) cls += ' excel-fill-range-left';
      if (visualCol === fillMaxCol) cls += ' excel-fill-range-right';
    }
    return cls;
  };

  const handleTdMouseDown = (visualCol: number, e: React.MouseEvent) => {
    if (e.button !== 0 || !canEdit) return;
    const isInput = (e.target as HTMLElement | null)?.tagName === 'INPUT';
    if (!isInput) {
      e.preventDefault();
    }
    onCellMouseDown(day, visualCol, e.shiftKey, isInput);
  };

  return (
    <tr
      onMouseEnter={() => onHoverDay(day)}
      className={`group h-8 ${isRowActive ? 'row-active ' : ''}${isSun ? 'row-sunday' : ''}`}
    >
      {/* 0 Ngày (Frozen - Click or drag to select entire row) */}
      <td
        onMouseDown={(e) => {
          if (e.button !== 0 || !canEdit) return;
          e.preventDefault();
          onRowHeaderMouseDown(day, e.shiftKey);
        }}
        onMouseEnter={() => onCellMouseEnter(day, 15)}
        title="Nhấn hoặc kéo để chọn cả hàng"
        className={`col-sticky-date border-border/50 sticky left-0 z-10 h-8 w-[44px] min-w-[44px] max-w-[44px] cursor-pointer border-r border-b p-0 text-center text-xs tabular-nums select-none ${
          isSun ? 'font-bold' : 'font-medium'
        }`}
      >
        <div className="flex h-full w-full items-center justify-center">
          <span>{String(day).padStart(2, '0')}</span>
        </div>
      </td>

      {/* 1 Thứ (Frozen - Click or drag to select entire row) */}
      <td
        onMouseDown={(e) => {
          if (e.button !== 0 || !canEdit) return;
          e.preventDefault();
          onRowHeaderMouseDown(day, e.shiftKey);
        }}
        onMouseEnter={() => onCellMouseEnter(day, 15)}
        title="Nhấn hoặc kéo để chọn cả hàng"
        className="col-sticky-day border-border/50 sticky left-[44px] z-10 h-8 w-[44px] min-w-[44px] max-w-[44px] cursor-pointer border-r border-b p-0 text-center text-xs select-none"
      >
        <div className="flex h-full w-full items-center justify-center">
          {isSun ? (
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              CN
            </span>
          ) : dow === 6 ? (
            <span className="text-foreground/85 font-medium">T7</span>
          ) : (
            <span className="text-muted-foreground">{DAY_LABELS[dow]}</span>
          )}
        </div>
      </td>

      {/* 2-5 AM/PM times (visualCols 0..3) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(0, e)}
        onMouseEnter={() => onCellMouseEnter(day, 0)}
        className={tdCls(
          'border-border/50 h-8 w-[54px] min-w-[54px] border-r border-b p-0 text-center text-xs tabular-nums',
          0,
          'checkInMorning',
        )}
      >
        <EditableTimeCell
          day={day}
          field="checkInMorning"
          value={r?.checkInMorning}
          canEdit={canEdit}
          isCellActive={rowActiveField === 'checkInMorning'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitTime={onCommitTime}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 0 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>
      <td
        onMouseDown={(e) => handleTdMouseDown(1, e)}
        onMouseEnter={() => onCellMouseEnter(day, 1)}
        className={tdCls(
          'border-border/50 h-8 w-[54px] min-w-[54px] border-r border-b p-0 text-center text-xs tabular-nums',
          1,
          'checkOutMorning',
        )}
      >
        <EditableTimeCell
          day={day}
          field="checkOutMorning"
          value={r?.checkOutMorning}
          canEdit={canEdit}
          isCellActive={rowActiveField === 'checkOutMorning'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitTime={onCommitTime}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 1 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>
      <td
        onMouseDown={(e) => handleTdMouseDown(2, e)}
        onMouseEnter={() => onCellMouseEnter(day, 2)}
        className={tdCls(
          'border-border/50 h-8 w-[54px] min-w-[54px] border-r border-b p-0 text-center text-xs tabular-nums',
          2,
          'checkInAfternoon',
        )}
      >
        <EditableTimeCell
          day={day}
          field="checkInAfternoon"
          value={r?.checkInAfternoon}
          canEdit={canEdit}
          isCellActive={rowActiveField === 'checkInAfternoon'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitTime={onCommitTime}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 2 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>
      <td
        onMouseDown={(e) => handleTdMouseDown(3, e)}
        onMouseEnter={() => onCellMouseEnter(day, 3)}
        className={tdCls(
          'border-border/50 h-8 w-[54px] min-w-[54px] border-r border-b p-0 text-center text-xs tabular-nums',
          3,
          'checkOutAfternoon',
        )}
      >
        <EditableTimeCell
          day={day}
          field="checkOutAfternoon"
          value={r?.checkOutAfternoon}
          canEdit={canEdit}
          isCellActive={rowActiveField === 'checkOutAfternoon'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitTime={onCommitTime}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 3 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>

      {/* 6-9 Lunch / Personal / Noon duties (visualCols 4..7) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(4, e)}
        onMouseEnter={() => onCellMouseEnter(day, 4)}
        className={tdCls(
          'border-border/50 h-8 w-[64px] min-w-[64px] border-r border-b p-0 text-center text-xs tabular-nums',
          4,
          'breakHours',
        )}
      >
        <EditableNumberCell
          day={day}
          field="breakHours"
          rawNum={r?.breakMinutes ? Number((r.breakMinutes / 60).toFixed(1)) : 0}
          displayText={
            r?.breakMinutes ? (Number(r.breakMinutes) / 60).toFixed(1) : ''
          }
          displayClassName={
            r?.breakMinutes
              ? 'text-foreground font-medium'
              : 'text-muted-foreground/30'
          }
          canEdit={canEdit}
          isCellActive={rowActiveField === 'breakHours'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitNumber={onCommitNumber}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 4 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>
      <td
        onMouseDown={(e) => handleTdMouseDown(5, e)}
        onMouseEnter={() => onCellMouseEnter(day, 5)}
        className={tdCls(
          'border-border/50 h-8 w-[64px] min-w-[64px] border-r border-b p-0 text-center text-xs tabular-nums',
          5,
          'personalBreakHours',
        )}
      >
        <EditableNumberCell
          day={day}
          field="personalBreakHours"
          rawNum={
            r?.personalBreakMinutes
              ? Number((r.personalBreakMinutes / 60).toFixed(1))
              : 0
          }
          displayText={
            r?.personalBreakMinutes
              ? (Number(r.personalBreakMinutes) / 60).toFixed(1)
              : ''
          }
          displayClassName={
            r?.personalBreakMinutes
              ? 'text-foreground font-medium'
              : 'text-muted-foreground/30'
          }
          canEdit={canEdit}
          isCellActive={rowActiveField === 'personalBreakHours'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitNumber={onCommitNumber}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 5 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>
      <td
        onMouseDown={(e) => handleTdMouseDown(6, e)}
        onMouseEnter={() => onCellMouseEnter(day, 6)}
        className={tdCls(
          'border-border/50 h-8 w-[64px] min-w-[64px] border-r border-b p-0 text-center text-xs tabular-nums',
          6,
          'lunchDutyHours',
        )}
      >
        <EditableNumberCell
          day={day}
          field="lunchDutyHours"
          rawNum={
            r?.lunchDutyMinutes
              ? Number((r.lunchDutyMinutes / 60).toFixed(1))
              : 0
          }
          displayText={
            r?.lunchDutyMinutes
              ? (Number(r.lunchDutyMinutes) / 60).toFixed(1)
              : ''
          }
          displayClassName={
            r?.lunchDutyMinutes
              ? 'text-foreground font-medium'
              : 'text-muted-foreground/30'
          }
          canEdit={canEdit}
          isCellActive={rowActiveField === 'lunchDutyHours'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitNumber={onCommitNumber}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 6 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>
      <td
        onMouseDown={(e) => handleTdMouseDown(7, e)}
        onMouseEnter={() => onCellMouseEnter(day, 7)}
        className={tdCls(
          'border-border/50 h-8 w-[64px] min-w-[64px] border-r border-b p-0 text-center text-xs tabular-nums',
          7,
          'duty30kHours',
        )}
      >
        <EditableNumberCell
          day={day}
          field="duty30kHours"
          rawNum={
            r?.duty30kMinutes ? Number((r.duty30kMinutes / 60).toFixed(1)) : 0
          }
          displayText={
            r?.duty30kMinutes ? (Number(r.duty30kMinutes) / 60).toFixed(1) : ''
          }
          displayClassName={
            r?.duty30kMinutes
              ? 'text-foreground font-medium'
              : 'text-muted-foreground/30'
          }
          canEdit={canEdit}
          isCellActive={rowActiveField === 'duty30kHours'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitNumber={onCommitNumber}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 7 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>

      {/* 10-11 Tổng giờ làm (Giờ, Phút) - Formula columns (visualCols 8..9) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(8, e)}
        onMouseEnter={() => onCellMouseEnter(day, 8)}
        className={tdCls(
          'border-border/50 excel-col-formula text-foreground h-8 w-[44px] min-w-[44px] border-r border-b p-0 text-center text-xs tabular-nums select-none',
          8,
        )}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <span
            className={
              worked > 0
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground/30 font-semibold'
            }
          >
            {worked > 0 ? String(Math.floor(worked / 60)) : '—'}
          </span>
        </div>
      </td>
      <td
        onMouseDown={(e) => handleTdMouseDown(9, e)}
        onMouseEnter={() => onCellMouseEnter(day, 9)}
        className={tdCls(
          'border-border/50 excel-col-formula h-8 w-[44px] min-w-[44px] border-r border-b p-0 text-center text-xs tabular-nums select-none',
          9,
        )}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {worked > 0 ? (
            <span className="text-foreground font-semibold">
              {String(worked % 60).padStart(2, '0')}
            </span>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )}
        </div>
      </td>

      {/* 12 Công chính - Formula column (visualCol 10) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(10, e)}
        onMouseEnter={() => onCellMouseEnter(day, 10)}
        className={tdCls(
          'border-border/50 excel-col-formula h-8 w-[72px] min-w-[72px] border-r border-b p-0 text-center text-xs tabular-nums select-none',
          10,
        )}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <span
            className={
              cong >= 1
                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                : cong > 0
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground/30'
            }
          >
            {fmtWork(worked)}
          </span>
        </div>
      </td>

      {/* 13 Giờ tăng ca - Formula column (visualCol 11) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(11, e)}
        onMouseEnter={() => onCellMouseEnter(day, 11)}
        className={tdCls(
          'border-border/50 excel-col-formula h-8 w-[60px] min-w-[60px] border-r border-b p-0 text-center text-xs tabular-nums select-none',
          11,
        )}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <span
            className={
              otMinutes > 0
                ? 'font-semibold text-sky-600 dark:text-sky-400'
                : 'text-muted-foreground/30'
            }
          >
            {otMinutes > 0 ? fmtDuration(otMinutes) : '—'}
          </span>
        </div>
      </td>

      {/* 14 Không đủ công - Formula column (visualCol 12) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(12, e)}
        onMouseEnter={() => onCellMouseEnter(day, 12)}
        className={tdCls(
          'border-border/50 excel-col-formula h-8 w-[68px] min-w-[68px] border-r border-b p-0 text-center text-xs tabular-nums select-none',
          12,
        )}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {deficit > 0 ? (
            <span className="inline-block rounded bg-amber-500/10 px-1 py-0 text-[11px] leading-tight font-semibold text-amber-700 tabular-nums dark:text-amber-400">
              {fmtDuration(deficit)}
            </span>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )}
        </div>
      </td>

      {/* 15 Trực đêm (lần) (visualCol 13) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(13, e)}
        onMouseEnter={() => onCellMouseEnter(day, 13)}
        className={tdCls(
          'border-border/50 h-8 w-[62px] min-w-[62px] border-r border-b p-0 text-center text-xs tabular-nums',
          13,
          'nightShift',
        )}
      >
        <EditableNumberCell
          day={day}
          field="nightShift"
          rawNum={Number(r?.nightShiftDutyCount) || 0}
          displayText={
            Number(r?.nightShiftDutyCount) > 0
              ? String(r?.nightShiftDutyCount)
              : ''
          }
          displayClassName={
            Number(r?.nightShiftDutyCount) > 0
              ? 'text-foreground font-semibold'
              : 'text-muted-foreground/30'
          }
          canEdit={canEdit}
          isCellActive={rowActiveField === 'nightShift'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitNumber={onCommitNumber}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 13 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>

      {/* 16 Đứng nước (lần) (visualCol 14) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(14, e)}
        onMouseEnter={() => onCellMouseEnter(day, 14)}
        className={tdCls(
          'border-border/50 h-8 w-[66px] min-w-[66px] border-r border-b p-0 text-center text-xs tabular-nums',
          14,
          'waterBooth',
        )}
      >
        <EditableNumberCell
          day={day}
          field="waterBooth"
          rawNum={Number(r?.waterBoothDutyCount) || 0}
          displayText={
            Number(r?.waterBoothDutyCount) > 0
              ? String(r?.waterBoothDutyCount)
              : ''
          }
          displayClassName={
            Number(r?.waterBoothDutyCount) > 0
              ? 'text-foreground font-semibold'
              : 'text-muted-foreground/30'
          }
          canEdit={canEdit}
          isCellActive={rowActiveField === 'waterBooth'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitNumber={onCommitNumber}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 14 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>

      {/* 17 Ghi chú (visualCol 15) */}
      <td
        onMouseDown={(e) => handleTdMouseDown(15, e)}
        onMouseEnter={() => onCellMouseEnter(day, 15)}
        className={tdCls(
          'border-border/50 h-8 w-[110px] min-w-[110px] border-b p-0 align-middle',
          15,
          'note',
        )}
      >
        <EditableNoteCell
          day={day}
          value={r?.note || ''}
          canEdit={canEdit}
          isCellActive={rowActiveField === 'note'}
          isMultiSelected={isMultiSelected}
          setActiveCell={setActiveCell}
          onCommitNote={onCommitNote}
          onPasteBlock={onPasteBlock}
          onStartFillDrag={
            showFillHandle && selMaxCol === 15 ? onStartFillDrag : undefined
          }
          totalDays={totalDays}
        />
      </td>
    </tr>
  );
});
