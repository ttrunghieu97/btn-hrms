'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import type {
  PeriodStatus,
  TimesheetWorkspaceEmployee,
  TimesheetWorkspaceRecord,
} from '../types';
import {
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
  type NavigationDirection,
  FIELD_BY_VISUAL_COL,
  FIELD_LABELS,
  ORDERED_FIELDS,
  VISUAL_COL_BY_FIELD,
  applyDayPatchToRecord,
  calculateWorkedMinutesFromPunches,
  getNextCell,
  getRecordFieldPatch,
  getVisualColDisplayValue,
  isHeaderColActive,
  normalizeEmployeeRecord,
  parseRawCellValueToUpdates,
  resolvePatchedAttendanceStatus,
} from '../timesheet-calculations';
import type { NumberCellField, TimeCellField } from './editable-cells';
import { PeriodWorkspaceHeader } from './period-workspace-header';
import {
  EmployeeDirectorySidebar,
  type EmployeeVerificationFilter,
} from './employee-directory-sidebar';
import { TimesheetToolbar } from './timesheet-toolbar';
import { AttendanceMobileAgenda } from './attendance-mobile-agenda';
import { TimesheetDayRow } from './timesheet-day-row';
import { TimesheetTableFooter } from './timesheet-table-footer';
import { TimesheetPrintAllView } from './timesheet-print-all-view';

export {
  applyDayPatchToRecord,
  calculateWorkedMinutesFromPunches,
  normalizeEmployeeRecord,
  resolvePatchedAttendanceStatus,
};

interface DetailSheetProps {
  period: string;
  employees: TimesheetWorkspaceEmployee[];
  records: TimesheetWorkspaceRecord[];
  canEdit: boolean;
  canTogglePeriodStatus?: boolean;
  onReload?: () => Promise<void>;
  navigatePeriod?: (delta: number) => void;
  onClosePeriod?: () => void;
  onReopenPeriod?: () => void;
  periodStatus?: PeriodStatus | string | null;
}

interface HistorySnapshot {
  stagedByEmployee: Record<string, Record<string, TimesheetWorkspaceRecord>>;
  dirtyFieldsByDate: Record<string, EditableField[]>;
}

const EMPTY_RECORD_MAP: ReadonlyMap<string, TimesheetWorkspaceRecord> = new Map();
const EMPTY_VERIFICATION_MAP: Record<string, 'draft' | 'done'> = {};
const VI_COLLATOR = new Intl.Collator('vi', { sensitivity: 'base' });

export function DetailSheet({
  period,
  employees,
  records,
  canEdit,
  canTogglePeriodStatus = canEdit,
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
  const [statusFilter, setStatusFilter] =
    React.useState<EmployeeVerificationFilter>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Pre-index incoming server records by employeeId -> Map<workDate, record> in O(N) once per fetch,
  // normalizing punch durations lazily per viewed employee so switching months with 1,500+ records is near-zero cost.
  const rawRecordsByEmployee = React.useMemo(() => {
    const byEmp = new Map<string, TimesheetWorkspaceRecord[]>();
    for (const r of records) {
      let list = byEmp.get(r.employeeId);
      if (!list) {
        list = [];
        byEmp.set(r.employeeId, list);
      }
      list.push(r);
    }
    return byEmp;
  }, [records]);

  const normalizedCacheRef = React.useRef<{
    records: TimesheetWorkspaceRecord[];
    byEmp: Map<string, Map<string, TimesheetWorkspaceRecord>>;
  }>({ records: [], byEmp: new Map() });

  if (normalizedCacheRef.current.records !== records) {
    normalizedCacheRef.current = { records, byEmp: new Map() };
  }

  const getEmployeeBaseRecords = React.useCallback(
    (empId: string): Map<string, TimesheetWorkspaceRecord> | undefined => {
      const cached = normalizedCacheRef.current.byEmp.get(empId);
      if (cached) return cached;
      const rawList = rawRecordsByEmployee.get(empId);
      if (!rawList) return undefined;
      const empMap = new Map<string, TimesheetWorkspaceRecord>();
      for (const r of rawList) {
        empMap.set(r.workDate, normalizeEmployeeRecord(r));
      }
      normalizedCacheRef.current.byEmp.set(empId, empMap);
      return empMap;
    },
    [rawRecordsByEmployee],
  );

  // Optimistic local state for staged record overrides (scoped by employeeId -> workDate) + dirty buffer + undo/redo stack
  const [stagedByEmployee, setStagedByEmployee] = React.useState<
    Record<string, Record<string, TimesheetWorkspaceRecord>>
  >({});
  const committedByEmployeeRef = React.useRef<
    Record<string, Record<string, TimesheetWorkspaceRecord>>
  >({});
  const savePromiseRef = React.useRef<Promise<boolean> | null>(null);
  const navActionSeqRef = React.useRef(0);
  const [dirtyFieldsByDate, setDirtyFieldsByDate] = React.useState<Record<string, EditableField[]>>({});
  const [undoStack, setUndoStack] = React.useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = React.useState<HistorySnapshot[]>([]);

  const prevRecordsRef = React.useRef(records);
  const prevPeriodRef = React.useRef(period);
  React.useEffect(() => {
    const periodChanged = prevPeriodRef.current !== period;
    const recordsChanged = prevRecordsRef.current !== records;
    if (!periodChanged && !recordsChanged) {
      return;
    }
    prevRecordsRef.current = records;
    prevPeriodRef.current = period;

    if (periodChanged) {
      committedByEmployeeRef.current = {};
      setStagedByEmployee((prev) =>
        Object.keys(prev).length === 0 ? prev : {},
      );
      setDirtyFieldsByDate((prev) =>
        Object.keys(prev).length === 0 ? prev : {},
      );
      setUndoStack((prev) => (prev.length === 0 ? prev : []));
      setRedoStack((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    // Same period, new server records (e.g. background refetch or post-save reload):
    // Preserve any unsaved staged edits for the active employee so user work is never lost.
    const curDirty = latestRef.current.dirtyFieldsByDate;
    const activeDirtyDates = Object.keys(curDirty);
    const selId = latestRef.current.selected?.id;
    committedByEmployeeRef.current = {};
    if (activeDirtyDates.length === 0 || !selId) {
      setStagedByEmployee((prev) =>
        Object.keys(prev).length === 0 ? prev : {},
      );
    } else {
      setStagedByEmployee((prev) => {
        const empStaged = prev[selId];
        if (!empStaged) return Object.keys(prev).length === 0 ? prev : {};
        const preserved: Record<string, TimesheetWorkspaceRecord> = {};
        for (const wd of activeDirtyDates) {
          if (empStaged[wd]) {
            preserved[wd] = empStaged[wd]!;
          }
        }
        return { [selId]: preserved };
      });
    }
  }, [records, period]);

  // Active cell coordinate, visual range selection anchor/end (0..15), and Fill Handle drag state
  const [activeCell, setActiveCellState] = React.useState<ActiveCell | null>(
    null,
  );
  const [selAnchor, setSelAnchor] = React.useState<{
    day: number;
    col: number;
  } | null>(null);
  const [selEnd, setSelEnd] = React.useState<{
    day: number;
    col: number;
  } | null>(null);
  const setActiveCell = React.useCallback((cell: ActiveCell | null) => {
    const anchor = cell
      ? { day: cell.day, col: VISUAL_COL_BY_FIELD[cell.field] }
      : null;
    latestRef.current.activeCell = cell;
    latestRef.current.selAnchor = anchor;
    latestRef.current.selEnd = null;
    setActiveCellState(cell);
    setSelAnchor(anchor);
    setSelEnd(null);
  }, []);
  const [fillDrag, setFillDrag] = React.useState<{
    startDay: number;
    endSourceDay: number;
    startColIdx: number;
    endColIdx: number;
    currentDay: number;
  } | null>(null);
  const isSelectingRef = React.useRef(false);
  const isRowHeaderSelectingRef = React.useRef(false);
  const dragStartRef = React.useRef<{ day: number; col: number } | null>(null);
  const didDragSelectRef = React.useRef(false);
  const [printAllActive, setPrintAllActive] = React.useState(false);

  React.useEffect(() => {
    const onAfterPrint = () => {
      setPrintAllActive(false);
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const selBounds = React.useMemo(() => {
    if (!selAnchor) return null;
    const end = selEnd ?? selAnchor;
    const minDay = Math.min(selAnchor.day, end.day);
    const maxDay = Math.max(selAnchor.day, end.day);
    const minCol = Math.min(selAnchor.col, end.col);
    const maxCol = Math.max(selAnchor.col, end.col);
    return {
      minDay,
      maxDay,
      minCol,
      maxCol,
      isSingle: minDay === maxDay && minCol === maxCol,
    };
  }, [selAnchor, selEnd]);

  React.useEffect(() => {
    if (
      latestRef.current.activeCell !== null ||
      latestRef.current.selAnchor !== null
    ) {
      setActiveCellState(null);
      setSelAnchor(null);
      setSelEnd(null);
    }
    if (latestRef.current.fillDrag !== null) {
      setFillDrag(null);
    }
  }, [selected?.id, period]);

  const buildEmployeeRecordMap = React.useCallback(
    (
      empId: string | undefined,
      stagedMapByEmp: Record<string, Record<string, TimesheetWorkspaceRecord>>,
    ): ReadonlyMap<string, TimesheetWorkspaceRecord> => {
      if (!empId) return EMPTY_RECORD_MAP;
      const baseMap = getEmployeeBaseRecords(empId);
      const empStaged = stagedMapByEmp[empId];
      if (!empStaged) {
        return baseMap ?? EMPTY_RECORD_MAP;
      }
      const stagedDates = Object.keys(empStaged);
      if (stagedDates.length === 0) {
        return baseMap ?? EMPTY_RECORD_MAP;
      }
      const merged = new Map<string, TimesheetWorkspaceRecord>(baseMap);
      for (const wd of stagedDates) {
        const rec = empStaged[wd];
        if (rec) merged.set(wd, rec);
      }
      return merged;
    },
    [getEmployeeBaseRecords],
  );

  const recordByDate = React.useMemo<
    ReadonlyMap<string, TimesheetWorkspaceRecord>
  >(
    () => buildEmployeeRecordMap(selected?.id, stagedByEmployee),
    [buildEmployeeRecordMap, selected?.id, stagedByEmployee],
  );

  const selectedStats: MonthStats | null = React.useMemo(
    () => (selected ? computeMonthStats(recordByDate, period, selected) : null),
    [recordByDate, period, selected],
  );

  const departments = React.useMemo(() => {
    const s = new Set<string>();
    for (const e of employees) if (e.departmentName) s.add(e.departmentName);
    return Array.from(s).sort();
  }, [employees]);

  const [isSaving, setIsSaving] = React.useState(false);
  const [verificationMap, setVerificationMap] = React.useState<
    Record<string, 'draft' | 'done'>
  >(EMPTY_VERIFICATION_MAP);
  const [isVerifying, setIsVerifying] = React.useState(false);

  const prevEmployeesRef = React.useRef(employees);
  React.useEffect(() => {
    if (prevEmployeesRef.current === employees) return;
    prevEmployeesRef.current = employees;
    setVerificationMap((prev) =>
      Object.keys(prev).length === 0 ? prev : EMPTY_VERIFICATION_MAP,
    );
  }, [employees]);

  const baseFiltered = React.useMemo(() => {
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
    return [...list].sort((a, b) => VI_COLLATOR.compare(a.fullName, b.fullName));
  }, [employees, search, dept]);

  const baseVerifiedCount = React.useMemo(
    () =>
      baseFiltered.filter(
        (emp) => (verificationMap[emp.id] ?? emp.verificationStatus) === 'done',
      ).length,
    [baseFiltered, verificationMap],
  );

  const filtered = React.useMemo(() => {
    if (statusFilter === 'verified') {
      return baseFiltered.filter(
        (e) => (verificationMap[e.id] ?? e.verificationStatus) === 'done',
      );
    }
    if (statusFilter === 'unverified') {
      return baseFiltered.filter(
        (e) => (verificationMap[e.id] ?? e.verificationStatus) !== 'done',
      );
    }
    return baseFiltered;
  }, [baseFiltered, statusFilter, verificationMap]);

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

  const totalDaysInMonth = selectedStats?.totalDays ?? 30;

  const latestRef = React.useRef({
    selected,
    canEdit,
    canTogglePeriodStatus,
    isPeriodOpen,
    isSaving,
    isVerifying,
    getEmployeeBaseRecords,
    stagedByEmployee,
    recordByDate,
    dirtyDates,
    dirtyFieldsByDate,
    verificationMap,
    filtered,
    period,
    totalDaysInMonth,
    activeCell,
    selAnchor,
    selEnd,
    selBounds,
    dirtyDayCount,
    undoStack,
    redoStack,
    fillDrag,
    onReload,
    navigatePeriod,
    onClosePeriod,
    onReopenPeriod,
    selectEmployee,
  });
  latestRef.current = {
    selected,
    canEdit,
    canTogglePeriodStatus,
    isPeriodOpen,
    isSaving,
    isVerifying,
    getEmployeeBaseRecords,
    stagedByEmployee,
    recordByDate,
    dirtyDates,
    dirtyFieldsByDate,
    verificationMap,
    filtered,
    period,
    totalDaysInMonth,
    activeCell,
    selAnchor,
    selEnd,
    selBounds,
    dirtyDayCount,
    undoStack,
    redoStack,
    fillDrag,
    onReload,
    navigatePeriod,
    onClosePeriod,
    onReopenPeriod,
    selectEmployee,
  };

  const stageDayPatches = React.useCallback(
    (patches: DayPatch[], toastMsg?: string) => {
      const {
        selected: sel,
        canEdit: editable,
        getEmployeeBaseRecords: getBaseRecords,
        stagedByEmployee: curStagedByEmp,
        dirtyFieldsByDate: curDirty,
        undoStack: curUndo,
        period: curPeriod,
      } = latestRef.current;
      if (!sel || !editable || patches.length === 0) return;

      const nextUndo = [
        ...curUndo.slice(-29),
        {
          stagedByEmployee: curStagedByEmp,
          dirtyFieldsByDate: curDirty,
        },
      ];

      const empBaseMap = getBaseRecords(sel.id);
      const empStaged = { ...(curStagedByEmp[sel.id] ?? {}) };
      for (const patch of patches) {
        const wd = dayDate(curPeriod, patch.day);
        const isSun = getDayOfWeek(wd) === 0;
        const currentRec = empStaged[wd] ?? empBaseMap?.get(wd);
        empStaged[wd] = applyDayPatchToRecord(
          currentRec,
          sel.id,
          wd,
          isSun,
          patch.updates,
        );
      }
      const nextStagedByEmp = {
        ...curStagedByEmp,
        [sel.id]: empStaged,
      };

      const nextDirty = { ...curDirty };
      for (const patch of patches) {
        const wd = dayDate(curPeriod, patch.day);
        const existing = nextDirty[wd] ?? [];
        nextDirty[wd] = Array.from(new Set([...existing, ...patch.fields]));
      }
      const nextDirtyDates = Object.keys(nextDirty);

      const nextRecordByDate = new Map<string, TimesheetWorkspaceRecord>(
        empBaseMap,
      );
      for (const [wd, rec] of Object.entries(empStaged)) {
        nextRecordByDate.set(wd, rec);
      }

      // Synchronously update latestRef so blur -> click in the same interaction tick sees all staged changes
      latestRef.current.undoStack = nextUndo;
      latestRef.current.redoStack = [];
      latestRef.current.stagedByEmployee = nextStagedByEmp;
      latestRef.current.dirtyFieldsByDate = nextDirty;
      latestRef.current.dirtyDates = nextDirtyDates;
      latestRef.current.dirtyDayCount = nextDirtyDates.length;
      latestRef.current.recordByDate = nextRecordByDate;

      setUndoStack(nextUndo);
      setRedoStack([]);
      setStagedByEmployee(nextStagedByEmp);
      setDirtyFieldsByDate(nextDirty);

      if (toastMsg) {
        showToast.info(toastMsg);
      }
    },
    [],
  );

  const stageSingleCell = React.useCallback(
    (day: number, field: EditableField, updates: DayCellUpdates) => {
      stageDayPatches([{ day, fields: [field], updates }]);
    },
    [stageDayPatches],
  );

  const handleCommitTime = React.useCallback(
    (day: number, field: TimeCellField, timeVal: string | null) => {
      stageSingleCell(day, field, { [field]: timeVal });
    },
    [stageSingleCell],
  );

  const handleCommitNumber = React.useCallback(
    (day: number, field: NumberCellField, num: number) => {
      switch (field) {
        case 'breakHours':
          stageSingleCell(day, field, { breakMinutes: Math.round(num * 60) });
          break;
        case 'personalBreakHours':
          stageSingleCell(day, field, {
            personalBreakMinutes: Math.round(num * 60),
          });
          break;
        case 'lunchDutyHours':
          stageSingleCell(day, field, {
            lunchDutyMinutes: Math.round(num * 60),
          });
          break;
        case 'duty30kHours':
          stageSingleCell(day, field, { duty30kMinutes: Math.round(num * 60) });
          break;
        case 'nightShift':
          stageSingleCell(day, field, { nightShiftDutyCount: Math.round(num) });
          break;
        case 'waterBooth':
          stageSingleCell(day, field, { waterBoothDutyCount: Math.round(num) });
          break;
      }
    },
    [stageSingleCell],
  );

  const handleCommitNote = React.useCallback(
    (day: number, str: string) => {
      stageSingleCell(day, 'note', { note: str });
    },
    [stageSingleCell],
  );

  const handleUndo = React.useCallback(() => {
    const {
      selected: sel,
      undoStack: curUndo,
      redoStack: curRedo,
      stagedByEmployee: curStagedByEmp,
      dirtyFieldsByDate: curDirty,
    } = latestRef.current;
    if (curUndo.length === 0) return;
    const last = curUndo[curUndo.length - 1]!;
    const nextRedo = [
      ...curRedo,
      {
        stagedByEmployee: curStagedByEmp,
        dirtyFieldsByDate: curDirty,
      },
    ];
    const nextUndo = curUndo.slice(0, -1);
    const nextDirtyDates = Object.keys(last.dirtyFieldsByDate);

    latestRef.current.undoStack = nextUndo;
    latestRef.current.redoStack = nextRedo;
    latestRef.current.stagedByEmployee = last.stagedByEmployee;
    latestRef.current.dirtyFieldsByDate = last.dirtyFieldsByDate;
    latestRef.current.dirtyDates = nextDirtyDates;
    latestRef.current.dirtyDayCount = nextDirtyDates.length;
    latestRef.current.recordByDate = buildEmployeeRecordMap(
      sel?.id,
      last.stagedByEmployee,
    );

    setRedoStack(nextRedo);
    setUndoStack(nextUndo);
    setStagedByEmployee(last.stagedByEmployee);
    setDirtyFieldsByDate(last.dirtyFieldsByDate);
  }, [buildEmployeeRecordMap]);

  const handleRedo = React.useCallback(() => {
    const {
      selected: sel,
      undoStack: curUndo,
      redoStack: curRedo,
      stagedByEmployee: curStagedByEmp,
      dirtyFieldsByDate: curDirty,
    } = latestRef.current;
    if (curRedo.length === 0) return;
    const next = curRedo[curRedo.length - 1]!;
    const nextUndo = [
      ...curUndo,
      {
        stagedByEmployee: curStagedByEmp,
        dirtyFieldsByDate: curDirty,
      },
    ];
    const nextRedo = curRedo.slice(0, -1);
    const nextDirtyDates = Object.keys(next.dirtyFieldsByDate);

    latestRef.current.undoStack = nextUndo;
    latestRef.current.redoStack = nextRedo;
    latestRef.current.stagedByEmployee = next.stagedByEmployee;
    latestRef.current.dirtyFieldsByDate = next.dirtyFieldsByDate;
    latestRef.current.dirtyDates = nextDirtyDates;
    latestRef.current.dirtyDayCount = nextDirtyDates.length;
    latestRef.current.recordByDate = buildEmployeeRecordMap(
      sel?.id,
      next.stagedByEmployee,
    );

    setUndoStack(nextUndo);
    setRedoStack(nextRedo);
    setStagedByEmployee(next.stagedByEmployee);
    setDirtyFieldsByDate(next.dirtyFieldsByDate);
  }, [buildEmployeeRecordMap]);

  const handleDiscardDirty = React.useCallback(() => {
    const restoredStaged = committedByEmployeeRef.current;
    latestRef.current.stagedByEmployee = restoredStaged;
    latestRef.current.dirtyFieldsByDate = {};
    latestRef.current.dirtyDates = [];
    latestRef.current.dirtyDayCount = 0;
    latestRef.current.undoStack = [];
    latestRef.current.redoStack = [];
    latestRef.current.recordByDate = buildEmployeeRecordMap(
      latestRef.current.selected?.id,
      restoredStaged,
    );

    setStagedByEmployee(restoredStaged);
    setDirtyFieldsByDate({});
    setUndoStack([]);
    setRedoStack([]);
    showToast.info('Đã hủy các thay đổi chưa lưu');
  }, [buildEmployeeRecordMap]);

  const handleSaveDirty = React.useCallback((): Promise<boolean> => {
    if (
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.closest('.timesheet-grid-table')
    ) {
      document.activeElement.blur();
    }
    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }
    const {
      selected: sel,
      canEdit: editable,
      dirtyDates: curDirtyDates,
      dirtyFieldsByDate: curDirtyMap,
      recordByDate: curRecordByDate,
      stagedByEmployee: curStagedByEmp,
      verificationMap: curVerificationMap,
      onReload: reloadFn,
    } = latestRef.current;
    if (!sel || !editable || curDirtyDates.length === 0) {
      return Promise.resolve(true);
    }

    const runSave = async (): Promise<boolean> => {
      setIsSaving(true);
      latestRef.current.isSaving = true;
      const savedDates = new Set<string>();
      try {
        const payloads: OverrideAttendanceSummaryDto[] = [];
        for (const wd of curDirtyDates) {
          const r = curRecordByDate.get(wd);
          if (!r) continue;
          const isSun = getDayOfWeek(wd) === 0;
          const worked = Number(r.workedMinutes) || 0;
          const payload: OverrideAttendanceSummaryDto = {
            employeeId: sel.id,
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
            chunk.map(async (p) => {
              await timekeepingControllerOverrideAttendanceSummary(p);
              savedDates.add(p.workDate);
            }),
          );
        }

        if (
          (curVerificationMap[sel.id] ?? sel.verificationStatus) === 'done'
        ) {
          setVerificationMap((prev) => ({ ...prev, [sel.id]: 'draft' }));
        }
        committedByEmployeeRef.current = curStagedByEmp;
        latestRef.current.dirtyFieldsByDate = {};
        latestRef.current.dirtyDates = [];
        latestRef.current.dirtyDayCount = 0;
        latestRef.current.undoStack = [];
        latestRef.current.redoStack = [];
        setDirtyFieldsByDate({});
        setUndoStack([]);
        setRedoStack([]);
        showToast.success(
          `Đã lưu ${payloads.length} ngày công của ${sel.fullName}`,
        );
        if (reloadFn) {
          await reloadFn();
        }
        return true;
      } catch (err: unknown) {
        if (savedDates.size > 0) {
          const remainingDirty: Record<string, EditableField[]> = {};
          for (const [wd, fields] of Object.entries(curDirtyMap)) {
            if (!savedDates.has(wd)) {
              remainingDirty[wd] = fields;
            }
          }
          const prevCommittedEmp =
            committedByEmployeeRef.current[sel.id] ?? {};
          const curEmpStaged = curStagedByEmp[sel.id] ?? {};
          const nextCommittedEmp = { ...prevCommittedEmp };
          savedDates.forEach((wd) => {
            if (curEmpStaged[wd]) {
              nextCommittedEmp[wd] = curEmpStaged[wd]!;
            }
          });
          committedByEmployeeRef.current = {
            ...committedByEmployeeRef.current,
            [sel.id]: nextCommittedEmp,
          };
          const remainingDates = Object.keys(remainingDirty);
          latestRef.current.dirtyFieldsByDate = remainingDirty;
          latestRef.current.dirtyDates = remainingDates;
          latestRef.current.dirtyDayCount = remainingDates.length;
          setDirtyFieldsByDate(remainingDirty);
        }
        const msg =
          err instanceof Error ? err.message : 'Lưu chấm công thất bại';
        showToast.error(msg);
        return false;
      } finally {
        savePromiseRef.current = null;
        latestRef.current.isSaving = false;
        setIsSaving(false);
      }
    };

    const promise = runSave();
    savePromiseRef.current = promise;
    return promise;
  }, []);

  const handleSelectEmployeeWithSaveCheck = React.useCallback(
    async (emp: TimesheetWorkspaceEmployee): Promise<boolean> => {
      const {
        selected: sel,
        dirtyDayCount: curDirtyCount,
        selectEmployee: selectEmpFn,
      } = latestRef.current;
      if (emp.id === sel?.id && !savePromiseRef.current) return true;
      const seq = ++navActionSeqRef.current;
      if (curDirtyCount > 0 || savePromiseRef.current) {
        const ok = await handleSaveDirty();
        if (!ok || seq !== navActionSeqRef.current) return false;
      }
      selectEmpFn(emp);
      return true;
    },
    [handleSaveDirty],
  );

  const handleNavigatePeriodWithSaveCheck = React.useCallback(
    async (delta: number) => {
      const { navigatePeriod: navFn, dirtyDayCount: curDirtyCount } =
        latestRef.current;
      if (!navFn) return;
      const seq = ++navActionSeqRef.current;
      if (curDirtyCount > 0 || savePromiseRef.current) {
        const ok = await handleSaveDirty();
        if (!ok || seq !== navActionSeqRef.current) return;
      }
      navFn(delta);
    },
    [handleSaveDirty],
  );

  const handleTogglePeriodStatus = React.useCallback(async () => {
    const {
      canTogglePeriodStatus: canToggle,
      dirtyDayCount: curDirtyCount,
      isPeriodOpen: curIsOpen,
      onClosePeriod: closeFn,
      onReopenPeriod: reopenFn,
    } = latestRef.current;
    if (!canToggle) return;
    const seq = ++navActionSeqRef.current;
    if (curDirtyCount > 0 || savePromiseRef.current) {
      const ok = await handleSaveDirty();
      if (!ok || seq !== navActionSeqRef.current) return;
    }
    if (curIsOpen) {
      if (closeFn) closeFn();
    } else {
      if (reopenFn) reopenFn();
    }
  }, [handleSaveDirty]);

  const handleEmployeeKeyDown = React.useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const curFiltered = latestRef.current.filtered;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = curFiltered[index + 1];
        if (next) {
          void handleSelectEmployeeWithSaveCheck(next).then((switched) => {
            if (switched) {
              document.getElementById(`emp-item-${next.id}`)?.focus();
            }
          });
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = curFiltered[index - 1];
        if (prev) {
          void handleSelectEmployeeWithSaveCheck(prev).then((switched) => {
            if (switched) {
              document.getElementById(`emp-item-${prev.id}`)?.focus();
            }
          });
        }
      }
    },
    [handleSelectEmployeeWithSaveCheck],
  );

  const handleToggleVerifyEmployee = React.useCallback(async () => {
    const {
      selected: sel,
      canEdit: editable,
      isVerifying: curIsVerifying,
      dirtyDayCount: curDirtyCount,
      verificationMap: curVerificationMap,
      period: curPeriod,
      onReload: reloadFn,
    } = latestRef.current;
    if (!sel || !editable || curIsVerifying) return;
    if (curDirtyCount > 0) {
      const saved = await handleSaveDirty();
      if (!saved) return;
    }
    const isVerified =
      (curVerificationMap[sel.id] ?? sel.verificationStatus) === 'done';
    setIsVerifying(true);
    try {
      if (isVerified) {
        await timekeepingControllerUnverifyEmployee(curPeriod, sel.id);
        setVerificationMap((prev) => ({ ...prev, [sel.id]: 'draft' }));
        showToast.success(`Đã mở chốt bảng công cho ${sel.fullName}`);
      } else {
        await timekeepingControllerVerifyEmployee(curPeriod, sel.id);
        setVerificationMap((prev) => ({ ...prev, [sel.id]: 'done' }));
        showToast.success(`Đã chốt bảng công cho ${sel.fullName}`);
      }
      if (reloadFn) {
        await reloadFn();
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
  }, [handleSaveDirty]);

  const handlePrintIndividual = React.useCallback(() => {
    setPrintAllActive(false);
    window.print();
  }, []);

  const handlePrintAll = React.useCallback(() => {
    setPrintAllActive(true);
    showToast.info('Đang chuẩn bị in bảng công toàn bộ nhân viên…');
    setTimeout(() => {
      window.print();
    }, 300);
  }, []);

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handlePasteBlock = React.useCallback(
    (startDay: number, startField: EditableField, rawText: string) => {
      const {
        selected: sel,
        canEdit: editable,
        totalDaysInMonth: maxDays,
        selBounds: curBounds,
      } = latestRef.current;
      if (!sel || !editable) return;
      const cleaned = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n$/, '');
      const rawRows = cleaned.split('\n');
      if (rawRows.length === 0) return;

      const startVisualCol = VISUAL_COL_BY_FIELD[startField];
      if (startVisualCol === undefined) return;

      // If 1 row was copied and a multi-row selection is active, repeat that row across the selected days
      const rows =
        rawRows.length === 1 &&
        curBounds &&
        curBounds.maxDay > curBounds.minDay &&
        startDay === curBounds.minDay
          ? Array.from(
              { length: curBounds.maxDay - curBounds.minDay + 1 },
              () => rawRows[0]!,
            )
          : rawRows;

      const patches: DayPatch[] = [];
      let cellCount = 0;

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const day = startDay + rIdx;
        if (day > maxDays) break;
        const cols = (rows[rIdx] ?? '').split('\t');
        const dayFields: EditableField[] = [];
        const dayUpdates: DayCellUpdates = {};

        for (let cIdx = 0; cIdx < cols.length; cIdx++) {
          const targetVisualCol = startVisualCol + cIdx;
          const targetField = FIELD_BY_VISUAL_COL[targetVisualCol];
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
    [stageDayPatches],
  );

  const handleRowHeaderMouseDown = React.useCallback(
    (day: number, shiftKey: boolean) => {
      isSelectingRef.current = true;
      isRowHeaderSelectingRef.current = true;
      didDragSelectRef.current = true;
      if (document.activeElement instanceof HTMLInputElement) {
        document.activeElement.blur();
      }
      const curAnchor = latestRef.current.selAnchor;
      const startDay = shiftKey && curAnchor ? curAnchor.day : day;
      const nextActive: ActiveCell = { day: startDay, field: 'checkInMorning' };
      const nextAnchor = { day: startDay, col: 0 };
      const nextEnd = { day, col: 15 };
      dragStartRef.current = nextAnchor;
      latestRef.current.activeCell = nextActive;
      latestRef.current.selAnchor = nextAnchor;
      latestRef.current.selEnd = nextEnd;
      setActiveCellState(nextActive);
      setSelAnchor(nextAnchor);
      setSelEnd(nextEnd);
    },
    [],
  );

  const handleHoverDay = React.useCallback((day: number) => {
    const curFill = latestRef.current.fillDrag;
    if (curFill && curFill.currentDay !== day) {
      if (day < curFill.startDay || day > curFill.endSourceDay) {
        didDragSelectRef.current = true;
      }
      const nextFill = { ...curFill, currentDay: day };
      latestRef.current.fillDrag = nextFill;
      setFillDrag(nextFill);
    }
  }, []);

  const handleCellMouseDown = React.useCallback(
    (
      day: number,
      visualCol: number,
      shiftKey: boolean,
      isTargetInput: boolean,
    ) => {
      isRowHeaderSelectingRef.current = false;
      didDragSelectRef.current = false;
      if (isTargetInput) {
        isSelectingRef.current = true;
        dragStartRef.current = { day, col: visualCol };
        return;
      }
      if (document.activeElement instanceof HTMLInputElement) {
        document.activeElement.blur();
      }

      isSelectingRef.current = true;
      const curAnchor = latestRef.current.selAnchor;
      if (shiftKey && curAnchor) {
        didDragSelectRef.current = true;
        dragStartRef.current = curAnchor;
        const nextEnd = { day, col: visualCol };
        latestRef.current.selEnd = nextEnd;
        setSelEnd(nextEnd);
      } else {
        const nextAnchor = { day, col: visualCol };
        const field = FIELD_BY_VISUAL_COL[visualCol];
        const nextActive: ActiveCell | null = field ? { day, field } : null;
        dragStartRef.current = nextAnchor;
        latestRef.current.activeCell = nextActive;
        latestRef.current.selAnchor = nextAnchor;
        latestRef.current.selEnd = null;
        setActiveCellState(nextActive);
        setSelAnchor(nextAnchor);
        setSelEnd(null);
      }
    },
    [],
  );

  const handleCellMouseEnter = React.useCallback(
    (day: number, visualCol: number) => {
      if (latestRef.current.fillDrag) {
        handleHoverDay(day);
        return;
      }
      if (!isSelectingRef.current) return;
      const start = dragStartRef.current;
      if (!start) return;
      const targetCol = isRowHeaderSelectingRef.current ? 15 : visualCol;
      if (
        day !== start.day ||
        targetCol !== start.col ||
        didDragSelectRef.current
      ) {
        didDragSelectRef.current = true;
        if (document.activeElement instanceof HTMLInputElement) {
          document.activeElement.blur();
        }
        window.getSelection()?.removeAllRanges();
        const nextEnd = { day, col: targetCol };
        latestRef.current.selAnchor = start;
        latestRef.current.selEnd = nextEnd;
        setSelAnchor((prev) =>
          prev?.day === start.day && prev?.col === start.col ? prev : start,
        );
        setSelEnd((prev) =>
          prev?.day === day && prev?.col === targetCol ? prev : nextEnd,
        );
      }
    },
    [handleHoverDay],
  );

  React.useEffect(() => {
    const onMouseUp = () => {
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        isRowHeaderSelectingRef.current = false;
      }
      if (didDragSelectRef.current) {
        setTimeout(() => {
          didDragSelectRef.current = false;
        }, 0);
      }
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  const handleStartFillDrag = React.useCallback(
    (day: number, field: EditableField) => {
      if (!latestRef.current.canEdit) return;
      isSelectingRef.current = false;
      didDragSelectRef.current = true;
      const curBounds = latestRef.current.selBounds;
      if (curBounds) {
        const nextFill = {
          startDay: curBounds.minDay,
          endSourceDay: curBounds.maxDay,
          startColIdx: curBounds.minCol,
          endColIdx: curBounds.maxCol,
          currentDay: curBounds.maxDay,
        };
        latestRef.current.fillDrag = nextFill;
        setFillDrag(nextFill);
      } else {
        const colIdx = VISUAL_COL_BY_FIELD[field];
        const anchor = { day, col: colIdx };
        const nextFill = {
          startDay: day,
          endSourceDay: day,
          startColIdx: colIdx,
          endColIdx: colIdx,
          currentDay: day,
        };
        latestRef.current.activeCell = { day, field };
        latestRef.current.selAnchor = anchor;
        latestRef.current.selEnd = null;
        latestRef.current.fillDrag = nextFill;
        setActiveCellState({ day, field });
        setSelAnchor(anchor);
        setSelEnd(null);
        setFillDrag(nextFill);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (!fillDrag) return;
    const handleMouseUp = () => {
      const curFill = latestRef.current.fillDrag;
      if (!curFill) return;
      const {
        selected: sel,
        canEdit: editable,
        period: curPeriod,
        recordByDate: curRecordByDate,
      } = latestRef.current;
      const isDraggingDown = curFill.currentDay > curFill.endSourceDay;
      const isDraggingUp = curFill.currentDay < curFill.startDay;
      if ((isDraggingDown || isDraggingUp) && sel && editable) {
        didDragSelectRef.current = true;
        const minDay = Math.min(curFill.startDay, curFill.currentDay);
        const maxDay = Math.max(curFill.endSourceDay, curFill.currentDay);
        const sourceSpan = Math.max(
          1,
          curFill.endSourceDay - curFill.startDay + 1,
        );
        const fieldsToCopy = ORDERED_FIELDS.filter((f) => {
          const vc = VISUAL_COL_BY_FIELD[f];
          return vc >= curFill.startColIdx && vc <= curFill.endColIdx;
        });

        const patches: DayPatch[] = [];
        for (let d = minDay; d <= maxDay; d++) {
          if (d >= curFill.startDay && d <= curFill.endSourceDay) continue;
          const offset =
            (((d - curFill.startDay) % sourceSpan) + sourceSpan) % sourceSpan;
          const srcDay = curFill.startDay + offset;
          const sourceWd = dayDate(curPeriod, srcDay);
          const sourceRec = curRecordByDate.get(sourceWd);

          const dayUpdates: DayCellUpdates = {};
          const dayFields: EditableField[] = [];
          for (const f of fieldsToCopy) {
            Object.assign(dayUpdates, getRecordFieldPatch(sourceRec, f));
            dayFields.push(f);
          }

          if (dayFields.length > 0) {
            patches.push({
              day: d,
              fields: dayFields,
              updates: dayUpdates,
            });
          }
        }
        if (patches.length > 0) {
          const label =
            fieldsToCopy.length === 1
              ? FIELD_LABELS[fieldsToCopy[0]!]
              : `${fieldsToCopy.length} cột`;
          stageDayPatches(
            patches,
            `Đã kéo sao chép ${label} cho ${patches.length} ngày`,
          );
          const firstField = fieldsToCopy[0];
          const nextActive = firstField
            ? { day: minDay, field: firstField }
            : null;
          const nextAnchor = { day: minDay, col: curFill.startColIdx };
          const nextEnd =
            minDay === maxDay && curFill.startColIdx === curFill.endColIdx
              ? null
              : { day: maxDay, col: curFill.endColIdx };
          latestRef.current.activeCell = nextActive;
          latestRef.current.selAnchor = nextAnchor;
          latestRef.current.selEnd = nextEnd;
          setActiveCellState(nextActive);
          setSelAnchor(nextAnchor);
          setSelEnd(nextEnd);
        }
      }
      latestRef.current.fillDrag = null;
      setFillDrag(null);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [fillDrag, stageDayPatches]);

  const saveDirtyRef = React.useRef(handleSaveDirty);
  saveDirtyRef.current = handleSaveDirty;

  React.useEffect(() => {
    if (dirtyDayCount === 0) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyDayCount]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod) {
        const key = e.key.toLowerCase();
        if (key === 's') {
          e.preventDefault();
          if (
            document.activeElement instanceof HTMLInputElement &&
            document.activeElement.closest('.timesheet-grid-table')
          ) {
            document.activeElement.blur();
          }
          if (latestRef.current.dirtyDayCount > 0) {
            void saveDirtyRef.current();
          }
          return;
        }
        const tag = (document.activeElement as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (key === 'z' && !e.shiftKey) {
          if (latestRef.current.undoStack.length > 0) {
            e.preventDefault();
            handleUndo();
          }
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
          if (latestRef.current.redoStack.length > 0) {
            e.preventDefault();
            handleRedo();
          }
        }
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const tag = activeEl?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Shift + Arrow extends/shrinks multi-cell range selection like Excel
      if (
        e.shiftKey &&
        !e.altKey &&
        (e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight')
      ) {
        const curAnchor = latestRef.current.selAnchor;
        if (!curAnchor) return;
        e.preventDefault();
        e.stopPropagation();
        const curEnd = latestRef.current.selEnd ?? curAnchor;
        const maxDays = latestRef.current.totalDaysInMonth;
        let nextDay = curEnd.day;
        let nextCol = curEnd.col;
        if (e.key === 'ArrowUp') nextDay = Math.max(1, curEnd.day - 1);
        else if (e.key === 'ArrowDown')
          nextDay = Math.min(maxDays, curEnd.day + 1);
        else if (e.key === 'ArrowLeft') nextCol = Math.max(0, curEnd.col - 1);
        else if (e.key === 'ArrowRight') nextCol = Math.min(15, curEnd.col + 1);
        if (nextDay !== curEnd.day || nextCol !== curEnd.col) {
          const nextEnd = { day: nextDay, col: nextCol };
          latestRef.current.selEnd = nextEnd;
          setSelEnd(nextEnd);
        }
        return;
      }

      // Delete / Backspace on a multi-cell range clears all selected cells at once
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.altKey) {
        const curBounds = latestRef.current.selBounds;
        if (curBounds && !curBounds.isSingle && latestRef.current.canEdit) {
          e.preventDefault();
          e.stopPropagation();
          const fieldsToClear = ORDERED_FIELDS.filter((f) => {
            const vc = VISUAL_COL_BY_FIELD[f];
            return vc >= curBounds.minCol && vc <= curBounds.maxCol;
          });
          if (fieldsToClear.length === 0) return;
          const patches: DayPatch[] = [];
          for (let d = curBounds.minDay; d <= curBounds.maxDay; d++) {
            const dayUpdates: DayCellUpdates = {};
            for (const f of fieldsToClear) {
              Object.assign(dayUpdates, parseRawCellValueToUpdates(f, '') ?? {});
            }
            patches.push({
              day: d,
              fields: fieldsToClear,
              updates: dayUpdates,
            });
          }
          if (patches.length > 0) {
            stageDayPatches(patches);
          }
          return;
        }
      }

      // Fallback navigation when DOM focus was lost (e.g. after row-header click, drag selection, or clicking a formula column)
      const isCellButtonFocused = Boolean(
        activeEl &&
          activeEl.getAttribute('role') === 'button' &&
          activeEl.closest('.timesheet-grid-table'),
      );
      if (
        !isCellButtonFocused &&
        tag !== 'SELECT' &&
        tag !== 'BUTTON' &&
        !activeEl?.isContentEditable &&
        latestRef.current.selAnchor &&
        !e.altKey
      ) {
        const curAnchor = latestRef.current.selAnchor;
        const curActive = latestRef.current.activeCell;
        const maxDays = latestRef.current.totalDaysInMonth;

        if (
          (e.key === 'Delete' || e.key === 'Backspace') &&
          curActive &&
          latestRef.current.canEdit
        ) {
          e.preventDefault();
          const parsed = parseRawCellValueToUpdates(curActive.field, '');
          if (parsed) {
            stageSingleCell(curActive.day, curActive.field, parsed);
          }
          return;
        }

        let navDir: NavigationDirection | null = null;
        if (e.key === 'ArrowDown') navDir = 'down';
        else if (e.key === 'ArrowUp') navDir = 'up';
        else if (e.key === 'ArrowRight') navDir = 'right';
        else if (e.key === 'ArrowLeft') navDir = 'left';
        else if (e.key === 'Tab') navDir = e.shiftKey ? 'prev' : 'next';
        else if (e.key === 'Enter')
          navDir = e.shiftKey ? 'enter-up' : 'enter-down';

        if (navDir) {
          e.preventDefault();
          if (curActive) {
            const next = getNextCell(curActive, navDir, maxDays);
            if (next) {
              setActiveCell(next);
            }
          } else {
            // Currently on a formula column (8..12)
            let nextDay = curAnchor.day;
            let nextCol = curAnchor.col;
            if (navDir === 'up' || navDir === 'enter-up') {
              nextDay = Math.max(1, curAnchor.day - 1);
            } else if (navDir === 'down' || navDir === 'enter-down') {
              nextDay = Math.min(maxDays, curAnchor.day + 1);
            } else if (navDir === 'left' || navDir === 'prev') {
              nextCol = Math.max(0, curAnchor.col - 1);
            } else if (navDir === 'right' || navDir === 'next') {
              nextCol = Math.min(15, curAnchor.col + 1);
            }
            const nextField = FIELD_BY_VISUAL_COL[nextCol];
            if (nextField) {
              setActiveCell({ day: nextDay, field: nextField });
            } else {
              const nextAnchor = { day: nextDay, col: nextCol };
              latestRef.current.selAnchor = nextAnchor;
              latestRef.current.selEnd = null;
              setSelAnchor(nextAnchor);
              setSelEnd(null);
            }
          }
        }
      }
    };

    const onCopy = (e: ClipboardEvent) => {
      const {
        selBounds: curBounds,
        selected: sel,
        period: curPeriod,
        recordByDate: curRecordByDate,
      } = latestRef.current;
      if (!curBounds || !sel) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (window.getSelection()?.toString()) return;

      const lines: string[] = [];
      for (let d = curBounds.minDay; d <= curBounds.maxDay; d++) {
        const wd = dayDate(curPeriod, d);
        const rec = curRecordByDate.get(wd);
        const cols: string[] = [];
        for (let vc = curBounds.minCol; vc <= curBounds.maxCol; vc++) {
          cols.push(getVisualColDisplayValue(rec, vc));
        }
        lines.push(cols.join('\t'));
      }
      e.clipboardData?.setData('text/plain', lines.join('\n'));
      e.preventDefault();
    };

    const onPaste = (e: ClipboardEvent) => {
      const {
        selBounds: curBounds,
        activeCell: curActive,
        selected: sel,
        canEdit: editable,
      } = latestRef.current;
      if ((!curBounds && !curActive) || !sel || !editable) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const pasted = e.clipboardData?.getData('text/plain') ?? '';
      if (!pasted) return;
      const startDay = curBounds ? curBounds.minDay : curActive!.day;
      const startVisualCol = curBounds
        ? curBounds.minCol
        : curActive
          ? VISUAL_COL_BY_FIELD[curActive.field]
          : -1;
      if (startVisualCol < 0) return;
      const startField = FIELD_BY_VISUAL_COL[startVisualCol];
      if (!startField) {
        e.preventDefault();
        showToast.warning('Cột công thức chỉ đọc, không thể dán dữ liệu');
        return;
      }
      e.preventDefault();
      handlePasteBlock(startDay, startField, pasted);
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('copy', onCopy);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('paste', onPaste);
    };
  }, [
    handleUndo,
    handleRedo,
    handlePasteBlock,
    setActiveCell,
    stageDayPatches,
    stageSingleCell,
  ]);

  const headerRows = React.useMemo(() => detailHeaderRows(), []);
  const detailDays = React.useMemo(
    () => Array.from({ length: totalDaysInMonth }, (_, i) => i + 1),
    [totalDaysInMonth],
  );
  const selectedRecords = React.useMemo(
    () => (currentMode === 'agenda' ? Array.from(recordByDate.values()) : []),
    [currentMode, recordByDate],
  );
  const employeesForSidebar = React.useMemo(() => {
    return filtered.map((emp) => {
      if (emp.id === selected?.id && selectedStats) {
        if (emp.workingDays === selectedStats.presentDays) return emp;
        return { ...emp, workingDays: selectedStats.presentDays };
      }
      const empStaged = stagedByEmployee[emp.id];
      if (empStaged && Object.keys(empStaged).length > 0) {
        const stats = computeMonthStats(
          buildEmployeeRecordMap(emp.id, stagedByEmployee),
          period,
          emp,
        );
        if (emp.workingDays === stats.presentDays) return emp;
        return { ...emp, workingDays: stats.presentDays };
      }
      return emp;
    });
  }, [
    buildEmployeeRecordMap,
    filtered,
    period,
    selected?.id,
    selectedStats,
    stagedByEmployee,
  ]);
  const getPrintEmployeeRecords = React.useCallback(
    (empId: string) => buildEmployeeRecordMap(empId, stagedByEmployee),
    [buildEmployeeRecordMap, stagedByEmployee],
  );

  if (!selected || !selectedStats) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <PeriodWorkspaceHeader
          period={period}
          periodStatus={periodStatus}
          totalEmployees={employees.length}
          verifiedCount={verifiedCount}
          onNavigatePeriod={handleNavigatePeriodWithSaveCheck}
          canTogglePeriodStatus={canTogglePeriodStatus}
          isPeriodOpen={isPeriodOpen}
          onTogglePeriodStatus={handleTogglePeriodStatus}
        />
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
          Không có nhân viên nào trong kỳ công {period}
        </div>
      </div>
    );
  }

  const s = selectedStats;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* Top-Level Period Workspace Header */}
      <PeriodWorkspaceHeader
        period={period}
        periodStatus={periodStatus}
        totalEmployees={employees.length}
        verifiedCount={verifiedCount}
        onNavigatePeriod={handleNavigatePeriodWithSaveCheck}
        canTogglePeriodStatus={canTogglePeriodStatus}
        isPeriodOpen={isPeriodOpen}
        onTogglePeriodStatus={handleTogglePeriodStatus}
      />

      {printAllActive && (
        <TimesheetPrintAllView
          period={period}
          employees={filtered}
          getEmployeeRecords={getPrintEmployeeRecords}
        />
      )}

      {currentMode === 'agenda' ? (
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto px-0.5 pb-6',
            printAllActive && 'print:hidden',
          )}
        >
          <AttendanceMobileAgenda
            period={period}
            employees={employees}
            selectedEmployee={selected}
            records={selectedRecords}
            verificationMap={verificationMap}
            canEdit={canEdit}
            isVerifying={isVerifying}
            onToggleVerifyEmployee={handleToggleVerifyEmployee}
            onSwitchToMatrix={() => setModeOverride('matrix')}
            onSelectEmployee={handleSelectEmployeeWithSaveCheck}
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex min-h-0 flex-1 overflow-hidden',
            printAllActive && 'print:hidden',
          )}
        >
          {/* Left Employee Directory Sidebar */}
          <EmployeeDirectorySidebar
            employees={employeesForSidebar}
            totalCount={baseFiltered.length}
            unverifiedCount={baseFiltered.length - baseVerifiedCount}
            verifiedCount={baseVerifiedCount}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selectedId={selected.id}
            search={search}
            onSearchChange={setSearch}
            dept={dept}
            departments={departments}
            onDeptChange={setDept}
            verificationMap={verificationMap}
            collapsed={sidebarCollapsed}
            onSelectEmployee={handleSelectEmployeeWithSaveCheck}
            onEmployeeKeyDown={handleEmployeeKeyDown}
          />

          {/* Right Workspace: 31-day Timesheet Grid */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Detail Table Container */}
            <div className="bg-card border-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
              <TimesheetToolbar
                employee={selected}
                verificationMap={verificationMap}
                isSelectedVerified={isSelectedVerified}
                isVerifying={isVerifying}
                canEdit={canEdit}
                periodStatus={periodStatus}
                sidebarCollapsed={sidebarCollapsed}
                dirtyDayCount={dirtyDayCount}
                dirtyCellCount={dirtyCellCount}
                undoCount={undoStack.length}
                redoCount={redoStack.length}
                isSaving={isSaving}
                onToggleSidebar={handleToggleSidebar}
                onToggleVerifyEmployee={handleToggleVerifyEmployee}
                onPrintIndividual={handlePrintIndividual}
                onPrintAll={handlePrintAll}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onDiscardDirty={handleDiscardDirty}
                onSaveDirty={handleSaveDirty}
              />

              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-width:thin]">
                <table className="timesheet-grid-table w-full min-w-[1080px] table-fixed border-separate border-spacing-0">
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
                    <col style={{ width: 110 }} />
                  </colgroup>
                  <TableHeader>
                    {headerRows.map((row) => (
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
                            selBounds?.minCol ?? -1,
                            selBounds?.maxCol ?? -1,
                          );

                          return (
                            <TableHead
                              key={`${row.isRow2 ? 'r2' : 'r1'}-${i}`}
                              colSpan={c.span}
                              rowSpan={c.rowSpan}
                              className={cn(
                                'border-border/50 text-muted-foreground border-r border-b px-1 text-xs font-medium tracking-normal normal-case select-none',
                                row.isRow2
                                  ? 'bg-muted sticky top-[30px] z-20 h-[28px] text-[11px]'
                                  : 'bg-muted sticky top-0 z-20 h-[30px]',
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
                  <TableBody
                    onClickCapture={(e) => {
                      if (didDragSelectRef.current) {
                        e.stopPropagation();
                        didDragSelectRef.current = false;
                      }
                    }}
                  >
                    {detailDays.map((day) => {
                      const wd = dayDate(period, day);
                      const dow = getDayOfWeek(wd);
                      const r = recordByDate.get(wd);
                      const rowActiveField =
                        activeCell?.day === day ? activeCell.field : null;
                      const rowAnchorCol =
                        selAnchor?.day === day ? selAnchor.col : -1;
                      const isRowInSel =
                        selBounds !== null &&
                        day >= selBounds.minDay &&
                        day <= selBounds.maxDay;
                      const selMinCol = isRowInSel ? selBounds.minCol : -1;
                      const selMaxCol = isRowInSel ? selBounds.maxCol : -1;
                      const selRowEdge = isRowInSel
                        ? selBounds.minDay === selBounds.maxDay
                          ? 'single'
                          : day === selBounds.minDay
                            ? 'top'
                            : day === selBounds.maxDay
                              ? 'bottom'
                              : 'middle'
                        : null;
                      const showFillHandle =
                        isRowInSel && day === selBounds.maxDay;

                      const dayDirtyFields = dirtyFieldsByDate[wd];
                      const isDraggingDown =
                        fillDrag !== null &&
                        fillDrag.currentDay > fillDrag.endSourceDay;
                      const isDraggingUp =
                        fillDrag !== null &&
                        fillDrag.currentDay < fillDrag.startDay;
                      const minDragDay = fillDrag
                        ? Math.min(fillDrag.startDay, fillDrag.currentDay)
                        : 0;
                      const maxDragDay = fillDrag
                        ? Math.max(fillDrag.endSourceDay, fillDrag.currentDay)
                        : 0;
                      const isInFillRange =
                        (isDraggingDown || isDraggingUp) &&
                        day >= minDragDay &&
                        day <= maxDragDay;
                      const fillMinCol =
                        isInFillRange && fillDrag ? fillDrag.startColIdx : -1;
                      const fillMaxCol =
                        isInFillRange && fillDrag ? fillDrag.endColIdx : -1;
                      const fillDragEdge = isInFillRange
                        ? minDragDay === maxDragDay
                          ? 'single'
                          : day === minDragDay
                            ? 'top'
                            : day === maxDragDay
                              ? 'bottom'
                              : 'middle'
                        : null;

                      return (
                        <TimesheetDayRow
                          key={day}
                          day={day}
                          wd={wd}
                          dow={dow}
                          record={r}
                          canEdit={canEdit}
                          totalDays={s.totalDays}
                          rowActiveField={rowActiveField}
                          rowAnchorCol={rowAnchorCol}
                          selMinCol={selMinCol}
                          selMaxCol={selMaxCol}
                          selRowEdge={selRowEdge}
                          showFillHandle={showFillHandle}
                          dayDirtyFields={dayDirtyFields}
                          fillMinCol={fillMinCol}
                          fillMaxCol={fillMaxCol}
                          fillDragEdge={fillDragEdge}
                          setActiveCell={setActiveCell}
                          onHoverDay={handleHoverDay}
                          onRowHeaderMouseDown={handleRowHeaderMouseDown}
                          onCellMouseDown={handleCellMouseDown}
                          onCellMouseEnter={handleCellMouseEnter}
                          onCommitTime={handleCommitTime}
                          onCommitNumber={handleCommitNumber}
                          onCommitNote={handleCommitNote}
                          onPasteBlock={handlePasteBlock}
                          onStartFillDrag={handleStartFillDrag}
                        />
                      );
                    })}
                  </TableBody>

                  <TimesheetTableFooter stats={s} />
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
