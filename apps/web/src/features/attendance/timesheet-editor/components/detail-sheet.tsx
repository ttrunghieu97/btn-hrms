'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/toast';
import { Icons } from '@/components/icons';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type {
  PeriodStatus,
  TimesheetWorkspaceEmployee,
  TimesheetWorkspaceRecord,
} from '../types';
import {
  DAY_LABELS,
  fmtDuration,
  fmtTime,
  fmtWork,
  dayDate,
  detailHeaderRows,
  getDayOfWeek,
} from '../detail-columns';
import { computeMonthStats, type MonthStats } from '../kpi-summary';
import { useEmployeeUrlSync } from '../hooks/use-employee-url-sync';
import {
  timekeepingControllerOverrideAttendanceSummary,
  timekeepingControllerVerifyEmployee,
  timekeepingControllerUnverifyEmployee,
} from '@/api/generated/attendance-timekeeping/attendance-timekeeping';
import type { OverrideAttendanceSummaryDto } from '@/api/generated/model';
import {
  type ActiveCell,
  type DayCellUpdates,
  type DayPatch,
  type EditableField,
  FIELD_LABELS,
  ORDERED_FIELDS,
  WEEKDAY_SHIFT_FIELDS,
  applyDayPatchToRecord,
  calculateWorkedMinutesFromPunches,
  getRecordFieldDisplayValue,
  getRecordFieldPatch,
  isHeaderColActive,
  parseRawCellValueToUpdates,
  resolvePatchedAttendanceStatus,
} from '../timesheet-calculations';
import {
  EditableNoteCell,
  EditableNumberCell,
  EditableTimeCell,
} from './editable-cells';
import { PeriodWorkspaceHeader } from './period-workspace-header';
import { EmployeeDirectorySidebar } from './employee-directory-sidebar';
import { EmployeeAttendanceSummaryCard } from './employee-attendance-summary-card';
import { TimesheetToolbar } from './timesheet-toolbar';
import { AttendanceMobileAgenda } from './attendance-mobile-agenda';

export {
  applyDayPatchToRecord,
  calculateWorkedMinutesFromPunches,
  resolvePatchedAttendanceStatus,
};

interface DetailSheetProps {
  period: string;
  employees: TimesheetWorkspaceEmployee[];
  records: TimesheetWorkspaceRecord[];
  canEdit: boolean;
  canTogglePeriodStatus?: boolean;
  onAdjust: (employee: TimesheetWorkspaceEmployee, workDate: string) => void;
  onReload?: () => Promise<void>;
  navigatePeriod?: (delta: number) => void;
  onClosePeriod?: () => void;
  onReopenPeriod?: () => void;
  periodStatus?: PeriodStatus | string | null;
}

interface HistorySnapshot {
  records: TimesheetWorkspaceRecord[];
  dirtyFieldsByDate: Record<string, EditableField[]>;
  manualOverrideDates: string[];
}

export function DetailSheet({
  period,
  employees,
  records,
  canEdit,
  canTogglePeriodStatus = canEdit,
  onAdjust,
  onReload,
  navigatePeriod,
  onClosePeriod,
  onReopenPeriod,
  periodStatus,
}: DetailSheetProps) {
  const isPeriodOpen = periodStatus === 'open' || periodStatus === 'in_review';

  const { selectedEmployee: selected, selectEmployee } = useEmployeeUrlSync({
    employees,
  });
  const isMobile = useIsMobile();
  const [modeOverride, setModeOverride] = React.useState<'agenda' | 'matrix' | null>(null);
  const currentMode = modeOverride ?? (isMobile ? 'agenda' : 'matrix');
  const [search, setSearch] = React.useState('');
  const [dept, setDept] = React.useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Optimistic local state for records + staged dirty buffer + undo/redo stack
  const [localRecords, setLocalRecords] = React.useState<TimesheetWorkspaceRecord[]>(records);
  const [dirtyFieldsByDate, setDirtyFieldsByDate] = React.useState<Record<string, EditableField[]>>({});
  const [manualOverrideDates, setManualOverrideDates] = React.useState<string[]>([]);
  const [undoStack, setUndoStack] = React.useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = React.useState<HistorySnapshot[]>([]);

  React.useEffect(() => {
    setLocalRecords(records);
    setDirtyFieldsByDate({});
    setManualOverrideDates([]);
    setUndoStack([]);
    setRedoStack([]);
  }, [records, period]);

  // Active cell coordinate for Excel keyboard navigation & Fill Handle drag state
  const [activeCell, setActiveCell] = React.useState<ActiveCell | null>(null);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [fillDrag, setFillDrag] = React.useState<{
    field: EditableField;
    startDay: number;
    currentDay: number;
  } | null>(null);

  React.useEffect(() => {
    setActiveCell(null);
    setIsEditing(false);
    setFillDrag(null);
  }, [selected?.id, period]);

  const selectedStats: MonthStats | null = selected
    ? computeMonthStats(localRecords, period, selected)
    : null;

  const departments = React.useMemo(() => {
    const s = new Set<string>();
    for (const e of employees) if (e.departmentName) s.add(e.departmentName);
    return Array.from(s).sort();
  }, [employees]);

  const filtered = React.useMemo(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q),
      );
    }
    if (dept) list = list.filter((e) => e.departmentName === dept);
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees, search, dept]);

  const [isSaving, setIsSaving] = React.useState(false);
  const [verificationMap, setVerificationMap] = React.useState<Record<string, 'draft' | 'done'>>({});
  const [isVerifying, setIsVerifying] = React.useState(false);

  React.useEffect(() => {
    const map: Record<string, 'draft' | 'done'> = {};
    for (const emp of employees) {
      map[emp.id] = emp.verificationStatus ?? 'draft';
    }
    setVerificationMap(map);
  }, [employees]);

  const verifiedCount = React.useMemo(
    () =>
      employees.filter(
        (emp) => (verificationMap[emp.id] ?? emp.verificationStatus) === 'done',
      ).length,
    [employees, verificationMap],
  );

  const isSelectedVerified = selected
    ? (verificationMap[selected.id] ?? selected.verificationStatus) === 'done'
    : false;

  const dirtyDates = React.useMemo(
    () => Object.keys(dirtyFieldsByDate),
    [dirtyFieldsByDate],
  );
  const dirtyDayCount = dirtyDates.length;
  const dirtyCellCount = React.useMemo(
    () =>
      Object.values(dirtyFieldsByDate).reduce(
        (sum, fields) => sum + fields.length,
        0,
      ),
    [dirtyFieldsByDate],
  );

  const stageDayPatches = React.useCallback(
    (patches: DayPatch[], toastMsg?: string) => {
      if (!selected || !canEdit || patches.length === 0) return;

      setUndoStack((prev) => [
        ...prev.slice(-29),
        {
          records: localRecords,
          dirtyFieldsByDate,
          manualOverrideDates,
        },
      ]);
      setRedoStack([]);

      setLocalRecords((prev) => {
        const next = [...prev];
        for (const patch of patches) {
          const wd = dayDate(period, patch.day);
          const isSun = getDayOfWeek(wd) === 0;
          const idx = next.findIndex(
            (r) => r.employeeId === selected.id && r.workDate === wd,
          );
          const updatedRec = applyDayPatchToRecord(
            idx >= 0 ? next[idx] : undefined,
            selected.id,
            wd,
            isSun,
            patch.updates,
          );
          if (idx >= 0) {
            next[idx] = updatedRec;
          } else {
            next.push(updatedRec);
          }
        }
        return next;
      });

      setDirtyFieldsByDate((prev) => {
        const next = { ...prev };
        for (const patch of patches) {
          const wd = dayDate(period, patch.day);
          const existing = next[wd] ?? [];
          next[wd] = Array.from(new Set([...existing, ...patch.fields]));
        }
        return next;
      });

      setManualOverrideDates((prev) => {
        const set = new Set(prev);
        for (const patch of patches) {
          const wd = dayDate(period, patch.day);
          if (
            patch.fields.includes('workedHours') ||
            patch.fields.includes('congChinh')
          ) {
            set.add(wd);
          } else if (
            patch.fields.some(
              (f) =>
                f === 'checkInMorning' ||
                f === 'checkOutMorning' ||
                f === 'checkInAfternoon' ||
                f === 'checkOutAfternoon',
            )
          ) {
            set.delete(wd);
          }
        }
        return Array.from(set);
      });

      if (toastMsg) {
        showToast.info(toastMsg);
      }
    },
    [
      selected,
      canEdit,
      localRecords,
      dirtyFieldsByDate,
      manualOverrideDates,
      period,
    ],
  );

  const stageSingleCell = React.useCallback(
    (day: number, field: EditableField, updates: DayCellUpdates) => {
      stageDayPatches([{ day, fields: [field], updates }]);
    },
    [stageDayPatches],
  );

  const handleUndo = React.useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1]!;
    setRedoStack((prev) => [
      ...prev,
      { records: localRecords, dirtyFieldsByDate, manualOverrideDates },
    ]);
    setUndoStack((prev) => prev.slice(0, -1));
    setLocalRecords(last.records);
    setDirtyFieldsByDate(last.dirtyFieldsByDate);
    setManualOverrideDates(last.manualOverrideDates);
  }, [undoStack, localRecords, dirtyFieldsByDate, manualOverrideDates]);

  const handleRedo = React.useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    setUndoStack((prev) => [
      ...prev,
      { records: localRecords, dirtyFieldsByDate, manualOverrideDates },
    ]);
    setRedoStack((prev) => prev.slice(0, -1));
    setLocalRecords(next.records);
    setDirtyFieldsByDate(next.dirtyFieldsByDate);
    setManualOverrideDates(next.manualOverrideDates);
  }, [redoStack, localRecords, dirtyFieldsByDate, manualOverrideDates]);

  const handleDiscardDirty = React.useCallback(() => {
    setLocalRecords(records);
    setDirtyFieldsByDate({});
    setManualOverrideDates([]);
    setUndoStack([]);
    setRedoStack([]);
    showToast.info('Đã hủy các thay đổi chưa lưu');
  }, [records]);

  const handleSaveDirty = React.useCallback(async (): Promise<boolean> => {
    if (!selected || !canEdit || dirtyDates.length === 0 || isSaving)
      return true;
    setIsSaving(true);
    try {
      const payloads: OverrideAttendanceSummaryDto[] = [];
      for (const wd of dirtyDates) {
        const r = localRecords.find(
          (rec) => rec.employeeId === selected.id && rec.workDate === wd,
        );
        if (!r) continue;
        const isSun = getDayOfWeek(wd) === 0;
        const worked = Number(r.workedMinutes) || 0;
        const payload: OverrideAttendanceSummaryDto = {
          employeeId: selected.id,
          workDate: wd,
          reason: 'manual_correction',
          checkInMorning: (r.checkInMorning ??
            null) as unknown as OverrideAttendanceSummaryDto['checkInMorning'],
          checkOutMorning: (r.checkOutMorning ??
            null) as unknown as OverrideAttendanceSummaryDto['checkOutMorning'],
          checkInAfternoon: (r.checkInAfternoon ??
            null) as unknown as OverrideAttendanceSummaryDto['checkInAfternoon'],
          checkOutAfternoon: (r.checkOutAfternoon ??
            null) as unknown as OverrideAttendanceSummaryDto['checkOutAfternoon'],
          breakMinutes: (r.breakMinutes ??
            0) as unknown as OverrideAttendanceSummaryDto['breakMinutes'],
          personalBreakMinutes: (r.personalBreakMinutes ??
            0) as unknown as OverrideAttendanceSummaryDto['personalBreakMinutes'],
          lunchDutyMinutes: (r.lunchDutyMinutes ??
            0) as unknown as OverrideAttendanceSummaryDto['lunchDutyMinutes'],
          duty30kMinutes: (r.duty30kMinutes ??
            0) as unknown as OverrideAttendanceSummaryDto['duty30kMinutes'],
          nightShiftDutyCount: (r.nightShiftDutyCount ??
            0) as unknown as OverrideAttendanceSummaryDto['nightShiftDutyCount'],
          waterBoothDutyCount: (r.waterBoothDutyCount ??
            0) as unknown as OverrideAttendanceSummaryDto['waterBoothDutyCount'],
          overriddenWorkedMinutes: worked,
          overriddenOvertimeMinutes: Number(r.overtimeMinutes) || 0,
          overriddenStatus: resolvePatchedAttendanceStatus({
            currentStatus: r.status,
            workedMinutes: worked,
            isSun,
          }) as OverrideAttendanceSummaryDto['overriddenStatus'],
          note: r.note ?? '',
        };
        payloads.push(payload);
      }

      const chunkSize = 8;
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((p) => timekeepingControllerOverrideAttendanceSummary(p)),
        );
      }

      if (
        (verificationMap[selected.id] ?? selected.verificationStatus) === 'done'
      ) {
        setVerificationMap((prev) => ({ ...prev, [selected.id]: 'draft' }));
      }
      setDirtyFieldsByDate({});
      setUndoStack([]);
      setRedoStack([]);
      showToast.success(
        `Đã lưu ${payloads.length} ngày công của ${selected.fullName}`,
      );
      if (onReload) {
        await onReload();
      }
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Lưu chấm công thất bại';
      showToast.error(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    selected,
    canEdit,
    dirtyDates,
    isSaving,
    localRecords,
    verificationMap,
    onReload,
  ]);

  const handleSelectEmployeeWithSaveCheck = React.useCallback(
    async (emp: TimesheetWorkspaceEmployee) => {
      if (emp.id === selected?.id) return;
      if (dirtyDayCount > 0) {
        const ok = await handleSaveDirty();
        if (!ok) return;
      }
      selectEmployee(emp);
    },
    [selected?.id, dirtyDayCount, handleSaveDirty, selectEmployee],
  );

  const handleNavigatePeriodWithSaveCheck = React.useCallback(
    async (delta: number) => {
      if (!navigatePeriod) return;
      if (dirtyDayCount > 0) {
        const ok = await handleSaveDirty();
        if (!ok) return;
      }
      navigatePeriod(delta);
    },
    [navigatePeriod, dirtyDayCount, handleSaveDirty],
  );

  const handleTogglePeriodStatus = React.useCallback(async () => {
    if (!canTogglePeriodStatus) return;
    if (dirtyDayCount > 0) {
      const ok = await handleSaveDirty();
      if (!ok) return;
    }
    if (isPeriodOpen) {
      if (onClosePeriod) onClosePeriod();
    } else {
      if (onReopenPeriod) onReopenPeriod();
    }
  }, [
    canTogglePeriodStatus,
    dirtyDayCount,
    handleSaveDirty,
    isPeriodOpen,
    onClosePeriod,
    onReopenPeriod,
  ]);

  const handleEmployeeKeyDown = React.useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = filtered[index + 1];
        if (next) {
          void handleSelectEmployeeWithSaveCheck(next);
          const nextEl = document.getElementById(`emp-item-${next.id}`);
          nextEl?.focus();
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = filtered[index - 1];
        if (prev) {
          void handleSelectEmployeeWithSaveCheck(prev);
          const prevEl = document.getElementById(`emp-item-${prev.id}`);
          prevEl?.focus();
        }
      }
    },
    [filtered, handleSelectEmployeeWithSaveCheck],
  );

  const handleToggleVerifyEmployee = React.useCallback(async () => {
    if (!selected || !canEdit || isVerifying) return;
    if (dirtyDayCount > 0) {
      const saved = await handleSaveDirty();
      if (!saved) return;
    }
    const isVerified =
      (verificationMap[selected.id] ?? selected.verificationStatus) === 'done';
    setIsVerifying(true);
    try {
      if (isVerified) {
        await timekeepingControllerUnverifyEmployee(period, selected.id);
        setVerificationMap((prev) => ({ ...prev, [selected.id]: 'draft' }));
        showToast.success(`Đã mở chốt bảng công cho ${selected.fullName}`);
      } else {
        await timekeepingControllerVerifyEmployee(period, selected.id);
        setVerificationMap((prev) => ({ ...prev, [selected.id]: 'done' }));
        showToast.success(`Đã chốt bảng công cho ${selected.fullName}`);
      }
      if (onReload) {
        await onReload();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Thao tác chốt công cá nhân thất bại';
      showToast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  }, [
    selected,
    canEdit,
    isVerifying,
    dirtyDayCount,
    handleSaveDirty,
    verificationMap,
    period,
    onReload,
  ]);

  const handlePrintIndividual = React.useCallback(() => {
    window.print();
  }, []);

  const handlePrintAll = React.useCallback(() => {
    showToast.info('Đang chuẩn bị in bảng công toàn bộ nhân viên…');
    setTimeout(() => {
      window.print();
    }, 300);
  }, []);

  const totalDaysInMonth = selectedStats?.totalDays ?? 30;

  const handlePasteBlock = React.useCallback(
    (startDay: number, startField: EditableField, rawText: string) => {
      if (!selected || !canEdit) return;
      const cleaned = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n$/, '');
      const rows = cleaned.split('\n');
      if (rows.length === 0) return;

      const startColIdx = ORDERED_FIELDS.indexOf(startField);
      if (startColIdx < 0) return;

      const patches: DayPatch[] = [];
      let cellCount = 0;

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const day = startDay + rIdx;
        if (day > totalDaysInMonth) break;
        const cols = (rows[rIdx] ?? '').split('\t');
        const dayFields: EditableField[] = [];
        const dayUpdates: DayCellUpdates = {};

        for (let cIdx = 0; cIdx < cols.length; cIdx++) {
          const targetField = ORDERED_FIELDS[startColIdx + cIdx];
          if (!targetField) continue;
          const parsed = parseRawCellValueToUpdates(
            targetField,
            cols[cIdx] ?? '',
          );
          if (parsed) {
            Object.assign(dayUpdates, parsed);
            dayFields.push(targetField);
            cellCount++;
          }
        }

        if (dayFields.length > 0) {
          patches.push({ day, fields: dayFields, updates: dayUpdates });
        }
      }

      if (patches.length > 0) {
        stageDayPatches(
          patches,
          `Đã dán ${cellCount} ô trên ${patches.length} ngày (Nhấn Ctrl+S để lưu)`,
        );
      }
    },
    [selected, canEdit, totalDaysInMonth, stageDayPatches],
  );

  const handleStartFillDrag = React.useCallback(
    (day: number, field: EditableField) => {
      if (!canEdit) return;
      setActiveCell({ day, field });
      setIsEditing(false);
      setFillDrag({ field, startDay: day, currentDay: day });
    },
    [canEdit],
  );

  React.useEffect(() => {
    if (!fillDrag) return;
    const handleMouseUp = () => {
      if (fillDrag.currentDay !== fillDrag.startDay && selected && canEdit) {
        const minDay = Math.min(fillDrag.startDay, fillDrag.currentDay);
        const maxDay = Math.max(fillDrag.startDay, fillDrag.currentDay);
        const sourceWd = dayDate(period, fillDrag.startDay);
        const sourceIsSun = getDayOfWeek(sourceWd) === 0;
        const sourceRec = localRecords.find(
          (r) => r.employeeId === selected.id && r.workDate === sourceWd,
        );
        const sourceUpdates = getRecordFieldPatch(sourceRec, fillDrag.field);

        const patches: DayPatch[] = [];
        for (let d = minDay; d <= maxDay; d++) {
          if (d === fillDrag.startDay) continue;
          const targetWd = dayDate(period, d);
          const targetIsSun = getDayOfWeek(targetWd) === 0;
          if (
            !sourceIsSun &&
            targetIsSun &&
            WEEKDAY_SHIFT_FIELDS.has(fillDrag.field)
          ) {
            continue;
          }
          patches.push({
            day: d,
            fields: [fillDrag.field],
            updates: sourceUpdates,
          });
        }
        if (patches.length > 0) {
          stageDayPatches(
            patches,
            `Đã kéo sao chép ${FIELD_LABELS[fillDrag.field]} cho ${patches.length} ngày`,
          );
        }
      }
      setFillDrag(null);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [fillDrag, selected, canEdit, period, localRecords, stageDayPatches]);

  const handleQuickFillStandardMonth = React.useCallback(() => {
    if (!selected || !canEdit) return;
    const empRecords = localRecords.filter((r) => r.employeeId === selected.id);
    const sample = empRecords.find(
      (r) =>
        r.checkInMorning &&
        r.checkOutMorning &&
        r.checkInAfternoon &&
        r.checkOutAfternoon,
    );
    const inM = sample ? fmtTime(sample.checkInMorning) : '08:00';
    const outM = sample ? fmtTime(sample.checkOutMorning) : '12:00';
    const inA = sample ? fmtTime(sample.checkInAfternoon) : '13:30';
    const outA = sample ? fmtTime(sample.checkOutAfternoon) : '17:30';

    const patches: DayPatch[] = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const wd = dayDate(period, d);
      const isSun = getDayOfWeek(wd) === 0;
      if (isSun) continue;
      const curr = empRecords.find((r) => r.workDate === wd);
      const hasData =
        Boolean(curr?.checkInMorning) ||
        Boolean(curr?.checkOutAfternoon) ||
        (Number(curr?.workedMinutes) || 0) > 0;
      if (!hasData) {
        patches.push({
          day: d,
          fields: [
            'checkInMorning',
            'checkOutMorning',
            'checkInAfternoon',
            'checkOutAfternoon',
          ],
          updates: {
            checkInMorning: inM === '-' ? '08:00' : inM,
            checkOutMorning: outM === '-' ? '12:00' : outM,
            checkInAfternoon: inA === '-' ? '13:30' : inA,
            checkOutAfternoon: outA === '-' ? '17:30' : outA,
          },
        });
      }
    }

    if (patches.length === 0) {
      showToast.info('Tất cả ngày T2–T7 trong tháng đã có dữ liệu công');
      return;
    }

    stageDayPatches(
      patches,
      `Đã điền ca chuẩn (${inM}–${outM}, ${inA}–${outA}) cho ${patches.length} ngày trống`,
    );
  }, [
    selected,
    canEdit,
    localRecords,
    totalDaysInMonth,
    period,
    stageDayPatches,
  ]);

  const handleQuickFillActiveDay = React.useCallback(() => {
    if (!selected || !canEdit) return;
    const targetDay = activeCell?.day ?? 1;
    stageDayPatches(
      [
        {
          day: targetDay,
          fields: [
            'checkInMorning',
            'checkOutMorning',
            'checkInAfternoon',
            'checkOutAfternoon',
          ],
          updates: {
            checkInMorning: '08:00',
            checkOutMorning: '12:00',
            checkInAfternoon: '13:30',
            checkOutAfternoon: '17:30',
          },
        },
      ],
      `Đã điền đủ công ngày ${String(targetDay).padStart(2, '0')}`,
    );
  }, [selected, canEdit, activeCell?.day, stageDayPatches]);

  const handleClearActiveDay = React.useCallback(() => {
    if (!selected || !canEdit || !activeCell) return;
    stageDayPatches(
      [
        {
          day: activeCell.day,
          fields: [
            'checkInMorning',
            'checkOutMorning',
            'checkInAfternoon',
            'checkOutAfternoon',
            'breakHours',
            'personalBreakHours',
            'lunchDutyHours',
            'duty30kHours',
            'workedHours',
            'otHours',
            'nightShift',
            'waterBooth',
          ],
          updates: {
            checkInMorning: null,
            checkOutMorning: null,
            checkInAfternoon: null,
            checkOutAfternoon: null,
            breakMinutes: 0,
            personalBreakMinutes: 0,
            lunchDutyMinutes: 0,
            duty30kMinutes: 0,
            workedMinutes: 0,
            overtimeMinutes: 0,
            nightShiftDutyCount: 0,
            waterBoothDutyCount: 0,
          },
        },
      ],
      `Đã xóa dữ liệu công ngày ${String(activeCell.day).padStart(2, '0')}`,
    );
  }, [selected, canEdit, activeCell, stageDayPatches]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (dirtyDayCount > 0) {
          void handleSaveDirty();
        }
        return;
      }
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (key === 'z' && !e.shiftKey) {
        if (undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        if (redoStack.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    const onCopy = (e: ClipboardEvent) => {
      if (isEditing || !activeCell || !selected) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (window.getSelection()?.toString()) return;

      const wd = dayDate(period, activeCell.day);
      const rec = localRecords.find(
        (r) => r.employeeId === selected.id && r.workDate === wd,
      );
      const val = getRecordFieldDisplayValue(rec, activeCell.field);
      e.clipboardData?.setData('text/plain', val);
      e.preventDefault();
    };

    const onPaste = (e: ClipboardEvent) => {
      if (isEditing || !activeCell || !selected || !canEdit) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const pasted = e.clipboardData?.getData('text/plain') ?? '';
      if (!pasted) return;
      e.preventDefault();
      handlePasteBlock(activeCell.day, activeCell.field, pasted);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('copy', onCopy);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('paste', onPaste);
    };
  }, [
    dirtyDayCount,
    handleSaveDirty,
    undoStack.length,
    redoStack.length,
    handleUndo,
    handleRedo,
    isEditing,
    activeCell,
    selected,
    canEdit,
    period,
    localRecords,
    handlePasteBlock,
  ]);

  if (!selected || !selectedStats) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <PeriodWorkspaceHeader
          period={period}
          periodStatus={periodStatus}
          totalEmployees={employees.length}
          verifiedCount={verifiedCount}
          currentMode={currentMode}
          onModeChange={setModeOverride}
          onNavigatePeriod={(delta) => {
            void handleNavigatePeriodWithSaveCheck(delta);
          }}
          canTogglePeriodStatus={canTogglePeriodStatus}
          isPeriodOpen={isPeriodOpen}
          onTogglePeriodStatus={() => {
            void handleTogglePeriodStatus();
          }}
        />
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
          Không có nhân viên nào trong kỳ công {period}
        </div>
      </div>
    );
  }

  const s = selectedStats;
  const detailDays = Array.from({ length: s.totalDays }, (_, i) => i + 1);
  const recordByDate = new Map(
    localRecords
      .filter((r) => r.employeeId === selected.id)
      .map((r) => [r.workDate, r]),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* Top-Level Period Workspace Header */}
      <PeriodWorkspaceHeader
        period={period}
        periodStatus={periodStatus}
        totalEmployees={employees.length}
        verifiedCount={verifiedCount}
        currentMode={currentMode}
        onModeChange={setModeOverride}
        onNavigatePeriod={(delta) => {
          void handleNavigatePeriodWithSaveCheck(delta);
        }}
        canTogglePeriodStatus={canTogglePeriodStatus}
        isPeriodOpen={isPeriodOpen}
        onTogglePeriodStatus={() => {
          void handleTogglePeriodStatus();
        }}
      />

      {currentMode === 'agenda' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-0.5 pb-6">
          <AttendanceMobileAgenda
            period={period}
            employees={employees}
            selectedEmployee={selected}
            records={localRecords}
            canEdit={canEdit}
            onSelectEmployee={(emp) => {
              void handleSelectEmployeeWithSaveCheck(emp);
            }}
            onAdjust={onAdjust}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left Employee Directory Sidebar */}
          <EmployeeDirectorySidebar
            employees={filtered}
            selectedId={selected.id}
            search={search}
            onSearchChange={setSearch}
            dept={dept}
            departments={departments}
            onDeptChange={setDept}
            verificationMap={verificationMap}
            collapsed={sidebarCollapsed}
            onSelectEmployee={(emp) => {
              void handleSelectEmployeeWithSaveCheck(emp);
            }}
            onEmployeeKeyDown={handleEmployeeKeyDown}
          />

          {/* Right Workspace: Employee Attendance Summary + 31-day Timesheet Grid */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 transition-all duration-300 ease-in-out">
            <EmployeeAttendanceSummaryCard
              employee={selected}
              stats={s}
              verificationMap={verificationMap}
              isSelectedVerified={isSelectedVerified}
              isVerifying={isVerifying}
              canEdit={canEdit}
              periodStatus={periodStatus}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
              onToggleVerifyEmployee={() => {
                void handleToggleVerifyEmployee();
              }}
              onPrintIndividual={handlePrintIndividual}
              onPrintAll={handlePrintAll}
            />

            {/* Detail Table Container */}
            <div className="bg-card border-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
              {canEdit && periodStatus !== 'closed' && (
                <TimesheetToolbar
                  activeCell={activeCell}
                  dirtyDayCount={dirtyDayCount}
                  dirtyCellCount={dirtyCellCount}
                  undoCount={undoStack.length}
                  redoCount={redoStack.length}
                  isSaving={isSaving}
                  onQuickFillStandardMonth={handleQuickFillStandardMonth}
                  onQuickFillActiveDay={handleQuickFillActiveDay}
                  onClearActiveDay={handleClearActiveDay}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onDiscardDirty={handleDiscardDirty}
                  onSaveDirty={() => {
                    void handleSaveDirty();
                  }}
                />
              )}

              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-width:thin]">
                <table className="timesheet-grid-table w-full min-w-[1130px] table-fixed border-separate border-spacing-0">
                  <colgroup>
                    <col style={{ width: 44 }} />
                    <col style={{ width: 44 }} />
                    <col style={{ width: 54 }} />
                    <col style={{ width: 54 }} />
                    <col style={{ width: 54 }} />
                    <col style={{ width: 54 }} />
                    <col style={{ width: 64 }} />
                    <col style={{ width: 64 }} />
                    <col style={{ width: 64 }} />
                    <col style={{ width: 64 }} />
                    <col style={{ width: 44 }} />
                    <col style={{ width: 44 }} />
                    <col style={{ width: 72 }} />
                    <col style={{ width: 60 }} />
                    <col style={{ width: 68 }} />
                    <col style={{ width: 62 }} />
                    <col style={{ width: 66 }} />
                    <col style={{ width: 160 }} />
                  </colgroup>
                  <TableHeader>
                    {detailHeaderRows().map((row) => (
                      <TableRow
                        key={row.isRow2 ? 'r2' : 'r1'}
                        className="border-0 hover:bg-transparent"
                      >
                        {row.cells.map((c, i) => {
                          const isStickyDate = !row.isRow2 && i === 0;
                          const isStickyDay = !row.isRow2 && i === 1;
                          const isColActive = isHeaderColActive(
                            row.isRow2,
                            i,
                            activeCell?.field,
                          );

                          return (
                            <TableHead
                              key={`${row.isRow2 ? 'r2' : 'r1'}-${i}`}
                              colSpan={c.span}
                              rowSpan={c.rowSpan}
                              className={cn(
                                'border-border/50 text-muted-foreground border-r border-b px-1 text-xs font-medium tracking-normal normal-case select-none',
                                row.isRow2
                                  ? 'bg-muted/30 sticky top-[30px] z-20 h-[28px] text-[11px] backdrop-blur-xs'
                                  : 'bg-muted/30 sticky top-0 z-20 h-[30px] backdrop-blur-xs',
                                isStickyDate &&
                                  'bg-card text-muted-foreground border-border/50 sticky top-0 left-0 z-30 border-r border-b font-medium',
                                isStickyDay &&
                                  'bg-card text-muted-foreground border-border/50 sticky top-0 left-[44px] z-30 border-r border-b font-medium',
                                isColActive && 'excel-col-active',
                                c.align === 'right' && 'text-right',
                                c.align === 'center' && 'text-center',
                                c.align === 'left' && 'pl-3 text-left',
                                c.width,
                                c.className,
                              )}
                            >
                              <div
                                className={cn(
                                  'flex flex-col leading-tight',
                                  c.align === 'left'
                                    ? 'items-start'
                                    : 'items-center justify-center',
                                )}
                              >
                                <span>{c.label}</span>
                                {c.sub ? (
                                  <span className="text-muted-foreground/75 text-[10px] font-normal tracking-normal lowercase">
                                    {c.sub}
                                  </span>
                                ) : null}
                              </div>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {detailDays.map((day) => {
                      const wd = dayDate(period, day);
                      const dow = getDayOfWeek(wd);
                      const r = recordByDate.get(wd);
                      const worked = Number(r?.workedMinutes) || 0;
                      const isSun = dow === 0;
                      const cong =
                        worked < 240 ? 0 : worked < 480 ? 0.5 : 1.0;
                      const deficit =
                        worked < 240
                          ? worked
                          : worked < 480
                            ? worked - 240
                            : 0;
                      const otMinutes =
                        (Number(r?.overtimeMinutes) || 0) > 0
                          ? Number(r?.overtimeMinutes)
                          : worked >= 480
                            ? worked - 480
                            : 0;
                      const isRowActive = activeCell?.day === day;
                      const activeField = activeCell?.field;
                      const dayDirtyFields = dirtyFieldsByDate[wd] ?? [];
                      const isManualOverrideDay =
                        manualOverrideDates.includes(wd);

                      const isInFillRange = (f: EditableField) => {
                        if (
                          !fillDrag ||
                          fillDrag.field !== f ||
                          fillDrag.startDay === fillDrag.currentDay
                        ) {
                          return false;
                        }
                        const minD = Math.min(
                          fillDrag.startDay,
                          fillDrag.currentDay,
                        );
                        const maxD = Math.max(
                          fillDrag.startDay,
                          fillDrag.currentDay,
                        );
                        return day >= minD && day <= maxD;
                      };

                      const cellStateCls = (
                        f: EditableField,
                        isFormula = false,
                      ) =>
                        cn(
                          isFormula && 'excel-col-formula',
                          activeField === f && 'excel-col-active',
                          activeCell?.day === day &&
                            activeCell?.field === f &&
                            'excel-active-cell',
                          dayDirtyFields.includes(f) && 'excel-cell-dirty',
                          isFormula &&
                            isManualOverrideDay &&
                            'excel-cell-override',
                          isInFillRange(f) && 'excel-fill-range',
                        );

                      return (
                        <TableRow
                          key={wd}
                          onMouseEnter={() => {
                            if (fillDrag && fillDrag.currentDay !== day) {
                              setFillDrag((prev) =>
                                prev ? { ...prev, currentDay: day } : null,
                              );
                            }
                          }}
                          onClick={() => {
                            setActiveCell((prev) =>
                              prev?.day === day
                                ? prev
                                : {
                                    day,
                                    field: prev?.field ?? 'checkInMorning',
                                  },
                            );
                            setIsEditing(false);
                          }}
                          className={cn(
                            'group h-8 transition-none',
                            isRowActive && 'row-active',
                            isSun && 'row-sunday',
                          )}
                        >
                          {/* 0 Ngày (Frozen) */}
                          <TableCell
                            className={cn(
                              'group/date col-sticky-date border-border/50 sticky left-0 z-10 h-8 w-[44px] min-w-[44px] max-w-[44px] border-r border-b p-0 text-center text-xs tabular-nums select-none',
                              isSun ? 'font-bold' : 'font-medium',
                            )}
                            onDoubleClick={() =>
                              canEdit && onAdjust(selected, wd)
                            }
                            title={
                              canEdit
                                ? 'Nhấp đúp để mở hộp thoại giải trình'
                                : undefined
                            }
                          >
                            <div className="flex h-full w-full items-center justify-center gap-0.5">
                              <span>{String(day).padStart(2, '0')}</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAdjust(selected, wd);
                                  }}
                                  title="Mở giải trình / điều chỉnh audit"
                                  className="text-muted-foreground hover:text-primary opacity-0 transition-opacity group-hover/date:opacity-100"
                                >
                                  <Icons.edit className="size-2.5" />
                                </button>
                              )}
                            </div>
                          </TableCell>

                          {/* 1 Thứ (Frozen) */}
                          <TableCell className="col-sticky-day border-border/50 sticky left-[44px] z-10 h-8 w-[44px] min-w-[44px] max-w-[44px] border-r border-b p-0 text-center text-xs select-none">
                            <div className="flex h-full w-full items-center justify-center">
                              {isSun ? (
                                <span className="font-semibold text-rose-600 dark:text-rose-400">
                                  CN
                                </span>
                              ) : dow === 6 ? (
                                <span className="text-foreground/85 font-medium">
                                  T7
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {DAY_LABELS[dow]}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* 2-5 AM/PM times */}
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[56px] min-w-[56px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('checkInMorning'),
                            )}
                          >
                            <EditableTimeCell
                              day={day}
                              field="checkInMorning"
                              value={r?.checkInMorning ?? r?.checkIn}
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(timeVal) => {
                                stageSingleCell(day, 'checkInMorning', {
                                  checkInMorning: timeVal,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[56px] min-w-[56px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('checkOutMorning'),
                            )}
                          >
                            <EditableTimeCell
                              day={day}
                              field="checkOutMorning"
                              value={r?.checkOutMorning}
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(timeVal) => {
                                stageSingleCell(day, 'checkOutMorning', {
                                  checkOutMorning: timeVal,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[56px] min-w-[56px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('checkInAfternoon'),
                            )}
                          >
                            <EditableTimeCell
                              day={day}
                              field="checkInAfternoon"
                              value={r?.checkInAfternoon}
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(timeVal) => {
                                stageSingleCell(day, 'checkInAfternoon', {
                                  checkInAfternoon: timeVal,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[56px] min-w-[56px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('checkOutAfternoon'),
                            )}
                          >
                            <EditableTimeCell
                              day={day}
                              field="checkOutAfternoon"
                              value={r?.checkOutAfternoon ?? r?.checkOut}
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(timeVal) => {
                                stageSingleCell(day, 'checkOutAfternoon', {
                                  checkOutAfternoon: timeVal,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>

                          {/* 6-9 Lunch / Personal / Noon duties */}
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[62px] min-w-[62px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('breakHours'),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="breakHours"
                              rawNum={
                                r?.breakMinutes
                                  ? Number((r.breakMinutes / 60).toFixed(1))
                                  : 0
                              }
                              displayNode={
                                <span
                                  className={
                                    r?.breakMinutes
                                      ? 'text-foreground font-medium'
                                      : 'text-muted-foreground/30'
                                  }
                                >
                                  {r?.breakMinutes
                                    ? (Number(r.breakMinutes) / 60).toFixed(1)
                                    : ''}
                                </span>
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(hours) => {
                                const mins = Math.round(hours * 60);
                                stageSingleCell(day, 'breakHours', {
                                  breakMinutes: mins,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[62px] min-w-[62px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('personalBreakHours'),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="personalBreakHours"
                              rawNum={
                                r?.personalBreakMinutes
                                  ? Number(
                                      (r.personalBreakMinutes / 60).toFixed(1),
                                    )
                                  : 0
                              }
                              displayNode={
                                <span
                                  className={
                                    r?.personalBreakMinutes
                                      ? 'text-foreground font-medium'
                                      : 'text-muted-foreground/30'
                                  }
                                >
                                  {r?.personalBreakMinutes
                                    ? (
                                        Number(r.personalBreakMinutes) / 60
                                      ).toFixed(1)
                                    : ''}
                                </span>
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(hours) => {
                                const mins = Math.round(hours * 60);
                                stageSingleCell(day, 'personalBreakHours', {
                                  personalBreakMinutes: mins,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[62px] min-w-[62px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('lunchDutyHours'),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="lunchDutyHours"
                              rawNum={
                                r?.lunchDutyMinutes
                                  ? Number(
                                      (r.lunchDutyMinutes / 60).toFixed(1),
                                    )
                                  : 0
                              }
                              displayNode={
                                <span
                                  className={
                                    r?.lunchDutyMinutes
                                      ? 'text-foreground font-medium'
                                      : 'text-muted-foreground/30'
                                  }
                                >
                                  {r?.lunchDutyMinutes
                                    ? (Number(r.lunchDutyMinutes) / 60).toFixed(
                                        1,
                                      )
                                    : ''}
                                </span>
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(hours) => {
                                const mins = Math.round(hours * 60);
                                stageSingleCell(day, 'lunchDutyHours', {
                                  lunchDutyMinutes: mins,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[62px] min-w-[62px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('duty30kHours'),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="duty30kHours"
                              rawNum={
                                r?.duty30kMinutes
                                  ? Number((r.duty30kMinutes / 60).toFixed(1))
                                  : 0
                              }
                              displayNode={
                                <span
                                  className={
                                    r?.duty30kMinutes
                                      ? 'text-foreground font-medium'
                                      : 'text-muted-foreground/30'
                                  }
                                >
                                  {r?.duty30kMinutes
                                    ? (Number(r.duty30kMinutes) / 60).toFixed(1)
                                    : ''}
                                </span>
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(hours) => {
                                const mins = Math.round(hours * 60);
                                stageSingleCell(day, 'duty30kHours', {
                                  duty30kMinutes: mins,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>

                          {/* 10-11 Tổng giờ làm (Giờ, Phút) - Formula column */}
                          <TableCell
                            className={cn(
                              'border-border/50 text-foreground h-8 w-[44px] min-w-[44px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('workedHours', true),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="workedHours"
                              rawNum={
                                worked > 0
                                  ? Number((worked / 60).toFixed(1))
                                  : 0
                              }
                              displayNode={
                                <span
                                  className={cn(
                                    'font-semibold',
                                    worked > 0
                                      ? 'text-foreground'
                                      : 'text-muted-foreground/30',
                                  )}
                                >
                                  {worked > 0 ? Math.floor(worked / 60) : '—'}
                                </span>
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(hours) => {
                                const mins = Math.round(hours * 60);
                                stageSingleCell(day, 'workedHours', {
                                  workedMinutes: mins,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'border-border/50 excel-col-formula h-8 w-[44px] min-w-[44px] border-r border-b p-0 text-center text-xs tabular-nums',
                              activeField === 'workedHours' &&
                                'excel-col-active',
                            )}
                          >
                            <div className="flex h-full w-full items-center justify-center">
                              {worked > 0 ? (
                                <span className="text-foreground font-semibold">
                                  {String(worked % 60).padStart(2, '0')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30">
                                  —
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* 12 Công chính - Formula column */}
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[70px] min-w-[70px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('congChinh', true),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="congChinh"
                              rawNum={cong}
                              displayNode={
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
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(val) => {
                                const mins = Math.round(val * 480);
                                stageSingleCell(day, 'congChinh', {
                                  workedMinutes: mins,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>

                          {/* 13 Giờ tăng ca */}
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[56px] min-w-[56px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('otHours'),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="otHours"
                              rawNum={
                                otMinutes > 0
                                  ? Number((otMinutes / 60).toFixed(1))
                                  : 0
                              }
                              displayNode={
                                <span
                                  className={
                                    otMinutes > 0
                                      ? 'font-semibold text-sky-600 dark:text-sky-400'
                                      : 'text-muted-foreground/30'
                                  }
                                >
                                  {otMinutes > 0
                                    ? fmtDuration(otMinutes)
                                    : '—'}
                                </span>
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(hours) => {
                                const mins = Math.round(hours * 60);
                                stageSingleCell(day, 'otHours', {
                                  overtimeMinutes: mins,
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>

                          {/* 14 Không đủ công - Formula column */}
                          <TableCell className="border-border/50 excel-col-formula h-8 w-[64px] min-w-[64px] border-r border-b p-0 text-center text-xs tabular-nums">
                            <div className="flex h-full w-full items-center justify-center">
                              {deficit > 0 ? (
                                <span className="inline-block rounded bg-amber-500/10 px-1 py-0 text-[11px] leading-tight font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                                  {fmtDuration(deficit)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30">
                                  —
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* 15 Trực đêm (lần) */}
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[56px] min-w-[56px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('nightShift'),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="nightShift"
                              rawNum={Number(r?.nightShiftDutyCount) || 0}
                              displayNode={
                                <span
                                  className={
                                    Number(r?.nightShiftDutyCount) > 0
                                      ? 'text-foreground font-semibold'
                                      : 'text-muted-foreground/30'
                                  }
                                >
                                  {Number(r?.nightShiftDutyCount) > 0
                                    ? r?.nightShiftDutyCount
                                    : ''}
                                </span>
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(count) => {
                                stageSingleCell(day, 'nightShift', {
                                  nightShiftDutyCount: Math.round(count),
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>

                          {/* 16 Đứng nước (lần) */}
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[56px] min-w-[56px] border-r border-b p-0 text-center text-xs tabular-nums',
                              cellStateCls('waterBooth'),
                            )}
                          >
                            <EditableNumberCell
                              day={day}
                              field="waterBooth"
                              rawNum={Number(r?.waterBoothDutyCount) || 0}
                              displayNode={
                                <span
                                  className={
                                    Number(r?.waterBoothDutyCount) > 0
                                      ? 'text-foreground font-semibold'
                                      : 'text-muted-foreground/30'
                                  }
                                >
                                  {Number(r?.waterBoothDutyCount) > 0
                                    ? r?.waterBoothDutyCount
                                    : ''}
                                </span>
                              }
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(count) => {
                                stageSingleCell(day, 'waterBooth', {
                                  waterBoothDutyCount: Math.round(count),
                                });
                              }}
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                            />
                          </TableCell>

                          {/* 17 Ghi chú */}
                          <TableCell
                            className={cn(
                              'border-border/50 h-8 w-[180px] min-w-[180px] border-b p-0 align-middle',
                              cellStateCls('note'),
                            )}
                          >
                            <EditableNoteCell
                              day={day}
                              value={r?.note || ''}
                              canEdit={canEdit}
                              activeCell={activeCell}
                              setActiveCell={setActiveCell}
                              isEditing={isEditing}
                              setIsEditing={setIsEditing}
                              onCommitValue={(str) =>
                                stageSingleCell(day, 'note', { note: str })
                              }
                              onPasteBlock={handlePasteBlock}
                              onStartFillDrag={handleStartFillDrag}
                              totalDays={s.totalDays}
                              isSun={isSun}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>

                  {/* Monthly Totals Footer */}
                  <TableFooter className="border-border bg-muted/40 sticky bottom-0 z-20 border-t">
                    <TableRow className="font-semibold hover:bg-transparent">
                      <TableCell className="bg-card border-border/50 sticky bottom-0 left-0 z-30 w-[44px] min-w-[44px] max-w-[44px] border-r px-1 text-center text-xs">
                        Tổng
                      </TableCell>
                      <TableCell className="bg-card border-border/50 sticky bottom-0 left-[44px] z-30 w-[44px] min-w-[44px] max-w-[44px] border-r px-1 text-center text-xs">
                        cộng
                      </TableCell>

                      {/* 4 AM/PM cols */}
                      <TableCell className="border-border/50 text-muted-foreground/40 w-[56px] min-w-[56px] border-r px-1 text-center text-xs">
                        —
                      </TableCell>
                      <TableCell className="border-border/50 text-muted-foreground/40 w-[56px] min-w-[56px] border-r px-1 text-center text-xs">
                        —
                      </TableCell>
                      <TableCell className="border-border/50 text-muted-foreground/40 w-[56px] min-w-[56px] border-r px-1 text-center text-xs">
                        —
                      </TableCell>
                      <TableCell className="border-border/50 text-muted-foreground/40 w-[56px] min-w-[56px] border-r px-1 text-center text-xs">
                        —
                      </TableCell>

                      {/* 4 Break/Duty cols */}
                      <TableCell className="border-border/50 text-foreground w-[62px] min-w-[62px] border-r px-1 text-center text-xs font-semibold tabular-nums">
                        {s.breakHours > 0 ? s.breakHours.toFixed(1) : '—'}
                      </TableCell>
                      <TableCell className="border-border/50 text-foreground w-[62px] min-w-[62px] border-r px-1 text-center text-xs font-semibold tabular-nums">
                        {s.personalBreakHours > 0
                          ? s.personalBreakHours.toFixed(1)
                          : '—'}
                      </TableCell>
                      <TableCell className="border-border/50 text-foreground w-[62px] min-w-[62px] border-r px-1 text-center text-xs font-semibold tabular-nums">
                        {s.lunchDutyHours > 0
                          ? s.lunchDutyHours.toFixed(1)
                          : '—'}
                      </TableCell>
                      <TableCell className="border-border/50 text-foreground w-[62px] min-w-[62px] border-r px-1 text-center text-xs font-semibold tabular-nums">
                        {s.duty35kHours > 0 ? s.duty35kHours.toFixed(1) : '—'}
                      </TableCell>

                      {/* 2 Total Hours cols: Giờ / Phút */}
                      <TableCell className="border-border/50 text-foreground w-[44px] min-w-[44px] border-r px-1 text-center text-xs font-semibold tabular-nums">
                        {Math.floor(s.totHours)}
                      </TableCell>
                      <TableCell className="border-border/50 text-foreground w-[44px] min-w-[44px] border-r px-1 text-center text-xs font-semibold tabular-nums">
                        {String(Math.round((s.totHours % 1) * 60)).padStart(
                          2,
                          '0',
                        )}
                      </TableCell>

                      {/* Công chính */}
                      <TableCell className="border-border/50 w-[70px] min-w-[70px] border-r bg-emerald-500/10 px-1 text-center text-xs font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                        {s.mainWork.toFixed(1)}
                      </TableCell>

                      {/* Tăng ca */}
                      <TableCell className="border-border/50 w-[56px] min-w-[56px] border-r bg-sky-500/10 px-1 text-center text-xs font-semibold text-sky-600 tabular-nums dark:text-sky-400">
                        {s.otHours > 0 ? s.otHours.toFixed(1) : '—'}
                      </TableCell>

                      {/* Thiếu công */}
                      <TableCell
                        className={cn(
                          'border-border/50 w-[64px] min-w-[64px] border-r px-1 text-center text-xs font-semibold tabular-nums',
                          s.deficitHours > 0
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground/40',
                        )}
                      >
                        {s.deficitHours > 0 ? s.deficitHours.toFixed(1) : '—'}
                      </TableCell>

                      {/* Trực đêm */}
                      <TableCell className="border-border/50 text-foreground w-[56px] min-w-[56px] border-r px-1 text-center text-xs font-semibold tabular-nums">
                        {s.night > 0 ? s.night : '—'}
                      </TableCell>

                      {/* Đứng nước */}
                      <TableCell className="border-border/50 text-foreground w-[56px] min-w-[56px] border-r px-1 text-center text-xs font-semibold tabular-nums">
                        {s.water > 0 ? s.water : '—'}
                      </TableCell>

                      {/* Ghi chú */}
                      <TableCell className="border-border/50 text-muted-foreground w-[180px] min-w-[180px] px-3 text-xs font-normal tabular-nums">
                        {s.presentDays}/{s.totalDays} ngày đi làm
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
