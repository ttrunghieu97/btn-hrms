'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/toast';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconPrinter, IconChevronDown, IconUser, IconUsers, IconLock, IconLockOpen } from '@tabler/icons-react';
import {
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type { PeriodStatus, TimesheetWorkspaceEmployee, TimesheetWorkspaceRecord } from '../types';
import {
  DAY_LABELS,
  fmtDuration,
  fmtTime,
  fmtWork,
  dayDate,
  detailHeaderRows,
  getDayOfWeek,
} from '../detail-columns';
import { computeMonthStats, formatVND, type MonthStats } from '../kpi-summary';
import { useEmployeeUrlSync } from '../hooks/use-employee-url-sync';
import {
  timekeepingControllerOverrideAttendanceSummary,
  timekeepingControllerVerifyEmployee,
  timekeepingControllerUnverifyEmployee,
} from '@/api/generated/attendance-timekeeping/attendance-timekeeping';
import type { OverrideAttendanceSummaryDto } from '@/api/generated/model';

interface DetailSheetProps {
  period: string;
  employees: TimesheetWorkspaceEmployee[];
  records: TimesheetWorkspaceRecord[];
  canEdit: boolean;
  onAdjust: (employee: TimesheetWorkspaceEmployee, workDate: string) => void;
  onReload?: () => Promise<void>;
  navigatePeriod?: (delta: number) => void;
  onClosePeriod?: () => void;
  onReopenPeriod?: () => void;
  periodStatus?: PeriodStatus | string | null;
}

const statusMap: StatusMap = {
  verified: { label: 'Đã chốt', variant: 'outline', className: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[9.5px] px-1.5 py-0 font-medium' },
  unverified: { label: 'Chưa chốt', variant: 'outline', className: 'border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-[9.5px] px-1.5 py-0 font-medium' },
  bad: { label: 'Chưa chấm công', variant: 'outline', className: 'border-border/80 text-muted-foreground bg-muted/50 text-[9.5px] px-1.5 py-0 font-medium' },
};

function employeeStatus(
  emp: TimesheetWorkspaceEmployee,
  vMap?: Record<string, 'draft' | 'done'>,
): 'verified' | 'unverified' | 'bad' {
  const currentStatus = vMap?.[emp.id] ?? emp.verificationStatus;
  if (currentStatus === 'done') return 'verified';
  if (emp.workingDays === 0) return 'bad';
  return 'unverified';
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

type EditableField =
  | 'checkInMorning'
  | 'checkOutMorning'
  | 'checkInAfternoon'
  | 'checkOutAfternoon'
  | 'breakHours'
  | 'personalBreakHours'
  | 'lunchDutyHours'
  | 'duty30kHours'
  | 'workedHours'
  | 'congChinh'
  | 'otHours'
  | 'nightShift'
  | 'waterBooth'
  | 'note';

const ORDERED_FIELDS: EditableField[] = [
  'checkInMorning',
  'checkOutMorning',
  'checkInAfternoon',
  'checkOutAfternoon',
  'breakHours',
  'personalBreakHours',
  'lunchDutyHours',
  'duty30kHours',
  'workedHours',
  'congChinh',
  'otHours',
  'nightShift',
  'waterBooth',
  'note',
];

interface ActiveCell {
  day: number;
  field: EditableField;
}

export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'next' | 'prev' | 'enter-down' | 'enter-up';

function getNextCell(
  current: ActiveCell,
  direction: NavigationDirection,
  totalDays: number,
): ActiveCell | null {
  const { day, field } = current;
  const colIdx = ORDERED_FIELDS.indexOf(field);
  if (colIdx < 0) return null;

  if (direction === 'enter-down') {
    if (day < totalDays) return { day: day + 1, field: 'checkInMorning' };
    return null;
  }
  if (direction === 'enter-up') {
    if (day > 1) return { day: day - 1, field: 'checkInMorning' };
    return null;
  }
  if (direction === 'up') {
    if (day > 1) return { day: day - 1, field };
    return null;
  }
  if (direction === 'down') {
    if (day < totalDays) return { day: day + 1, field };
    return null;
  }
  if (direction === 'left') {
    if (colIdx > 0) return { day, field: ORDERED_FIELDS[colIdx - 1]! };
    return null;
  }
  if (direction === 'right') {
    if (colIdx < ORDERED_FIELDS.length - 1) return { day, field: ORDERED_FIELDS[colIdx + 1]! };
    return null;
  }
  if (direction === 'next') {
    if (colIdx < ORDERED_FIELDS.length - 1) {
      return { day, field: ORDERED_FIELDS[colIdx + 1]! };
    }
    if (day < totalDays) {
      return { day: day + 1, field: ORDERED_FIELDS[0]! };
    }
    return null;
  }
  if (direction === 'prev') {
    if (colIdx > 0) {
      return { day, field: ORDERED_FIELDS[colIdx - 1]! };
    }
    if (day > 1) {
      return { day: day - 1, field: ORDERED_FIELDS[ORDERED_FIELDS.length - 1]! };
    }
    return null;
  }
  return null;
}

function normalizeTimeString(raw: string): string | null {
  const s = raw.trim();
  if (!s || s === '-' || s === '—' || s === '0') return null;
  if (/^\d{1,2}$/.test(s)) {
    const h = parseInt(s, 10);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
  }
  if (/^\d{3,4}$/.test(s)) {
    const padded = s.padStart(4, '0');
    const h = parseInt(padded.slice(0, 2), 10);
    const m = parseInt(padded.slice(2, 4), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  if (/^\d{1,2}:\d{1,2}$/.test(s)) {
    const [hStr, mStr] = s.split(':');
    const h = parseInt(hStr!, 10);
    const m = parseInt(mStr!, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return s;
}

function calculateWorkedMinutesFromPunches(params: {
  checkInMorning?: string | null;
  checkOutMorning?: string | null;
  checkInAfternoon?: string | null;
  checkOutAfternoon?: string | null;
  personalBreakMinutes?: number | null;
  breakMinutes?: number | null;
  lunchDutyMinutes?: number | null;
  duty30kMinutes?: number | null;
}): number | null {
  const parseMins = (t?: string | null) => {
    if (!t) return null;
    const norm = normalizeTimeString(t);
    if (!norm || !norm.includes(':')) return null;
    const [h, m] = norm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const inM = parseMins(params.checkInMorning);
  const outM = parseMins(params.checkOutMorning);
  const inA = parseMins(params.checkInAfternoon);
  const outA = parseMins(params.checkOutAfternoon);
  const personal = params.personalBreakMinutes || 0;
  const breakMins = params.breakMinutes || 0;
  const lunchDuty = params.lunchDutyMinutes || 0;
  const duty35k = params.duty30kMinutes || 0;

  let total = 0;
  let hasAny = false;

  if (inM != null && outM != null && outM > inM) {
    total += (outM - inM);
    hasAny = true;
  }
  if (inA != null && outA != null && outA > inA) {
    total += (outA - inA);
    hasAny = true;
  }

  // If user only provided single full day: inM to outA
  if (inM != null && outA != null && outM == null && inA == null && outA > inM) {
    const fullSpan = outA - inM;
    const defaultLunch = params.breakMinutes != null ? params.breakMinutes : 90;
    total = Math.max(0, fullSpan - defaultLunch);
    hasAny = true;
  }

  if (!hasAny) return null;
  return Math.max(0, total - personal - breakMins - lunchDuty - duty35k);
}

interface EditableTimeCellProps {
  day: number;
  field: 'checkInMorning' | 'checkOutMorning' | 'checkInAfternoon' | 'checkOutAfternoon';
  value: string | null | undefined;
  canEdit: boolean;
  activeCell: ActiveCell | null;
  setActiveCell: (cell: ActiveCell | null) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onCommitValue: (val: string | null) => void;
  onPasteMulti: (lines: string[]) => void;
  totalDays: number;
  className?: string;
}

function EditableTimeCell({
  day,
  field,
  value,
  canEdit,
  activeCell,
  setActiveCell,
  isEditing,
  setIsEditing,
  onCommitValue,
  onPasteMulti,
  totalDays,
  className,
}: EditableTimeCellProps) {
  const isCellActive = activeCell?.day === day && activeCell?.field === field;
  const isCellEditing = isCellActive && isEditing;
  const initialDisplay = value ? fmtTime(value) : '';
  const [val, setVal] = React.useState(initialDisplay === '-' ? '' : initialDisplay);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isNavigatingRef = React.useRef(false);

  React.useEffect(() => {
    if (!isCellEditing) {
      const disp = value ? fmtTime(value) : '';
      setVal(disp === '-' ? '' : disp);
    }
  }, [value, isCellEditing]);

  React.useLayoutEffect(() => {
    if (isCellEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (isCellActive) {
      containerRef.current?.focus();
    }
  }, [isCellActive, isCellEditing]);

  const commit = (str: string) => {
    const norm = normalizeTimeString(str);
    const currDisp = value ? fmtTime(value) : null;
    const cleanOrig = !currDisp || currDisp === '-' ? null : currDisp;
    if (norm !== cleanOrig) {
      onCommitValue(norm);
    }
  };

  const navigate = (direction: NavigationDirection) => {
    const next = getNextCell({ day, field }, direction, totalDays);
    if (next) {
      setActiveCell(next);
      setIsEditing(false);
    }
  };

  if (isCellEditing && canEdit) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <input
          ref={inputRef}
          type="text"
          placeholder="08:00"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            if (isNavigatingRef.current) {
              isNavigatingRef.current = false;
              return;
            }
            commit(val);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              isNavigatingRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate(e.shiftKey ? 'enter-up' : 'enter-down');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              isNavigatingRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate('down');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              isNavigatingRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate('up');
            } else if (e.key === 'ArrowRight') {
              const target = e.currentTarget;
              const isAllSelected = target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtEnd = target.selectionEnd === target.value.length;
              if (isAllSelected || isAtEnd) {
                e.preventDefault();
                isNavigatingRef.current = true;
                commit(val);
                setIsEditing(false);
                navigate('right');
              }
            } else if (e.key === 'ArrowLeft') {
              const target = e.currentTarget;
              const isAllSelected = target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtStart = target.selectionStart === 0;
              if (isAllSelected || isAtStart) {
                e.preventDefault();
                isNavigatingRef.current = true;
                commit(val);
                setIsEditing(false);
                navigate('left');
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              isNavigatingRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate(e.shiftKey ? 'prev' : 'next');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              isNavigatingRef.current = true;
              setVal(initialDisplay === '-' ? '' : initialDisplay);
              setIsEditing(false);
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            const lines = pasted.split(/\r\n|\n|\r/).map((l) => l.trim()).filter((l) => l.length > 0);
            if (lines.length > 1) {
              e.preventDefault();
              onPasteMulti(lines);
              setIsEditing(false);
            }
          }}
          className="h-full w-full bg-white dark:bg-zinc-900 px-0.5 text-center font-mono text-[12px] font-semibold text-foreground outline-none border-0 m-0 shadow-none ring-0 tabular-nums select-all"
        />
      </div>
    );
  }

  const formatted = fmtTime(value);
  const hasValue = formatted !== '-';

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={canEdit ? (isCellActive ? 0 : -1) : undefined}
      onClick={() => {
        if (!canEdit) return;
        setActiveCell({ day, field });
        setIsEditing(false);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        setActiveCell({ day, field });
        setIsEditing(true);
      }}
      onKeyDown={(e) => {
        if (!canEdit || !isCellActive) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigate('down');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigate('up');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigate('right');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigate('left');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          navigate(e.shiftKey ? 'prev' : 'next');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          navigate(e.shiftKey ? 'enter-up' : 'enter-down');
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onCommitValue(null);
        } else if (e.key === 'F2') {
          e.preventDefault();
          setIsEditing(true);
        } else if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          setVal(e.key);
          setIsEditing(true);
        }
      }}
      title={canEdit ? 'Nhấp để chọn ô, gõ để sửa' : undefined}
      className={cn(
        'relative flex h-full w-full items-center justify-center font-mono text-[12px] tabular-nums select-none outline-none transition-none',
        hasValue ? 'text-foreground font-medium' : 'text-muted-foreground/30',
        canEdit && 'cursor-cell',
        className,
      )}
    >
      <span>{hasValue ? formatted : '—'}</span>
    </div>
  );
}

interface EditableNumberCellProps {
  day: number;
  field:
    | 'workedHours'
    | 'congChinh'
    | 'otHours'
    | 'breakHours'
    | 'personalBreakHours'
    | 'lunchDutyHours'
    | 'duty30kHours'
    | 'nightShift'
    | 'waterBooth';
  rawNum: number;
  displayNode: React.ReactNode;
  canEdit: boolean;
  className?: string;
  activeCell: ActiveCell | null;
  setActiveCell: (cell: ActiveCell | null) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onCommitValue: (num: number) => void;
  onPasteMulti: (lines: string[]) => void;
  totalDays: number;
}

function EditableNumberCell({
  day,
  field,
  rawNum,
  displayNode,
  canEdit,
  className,
  activeCell,
  setActiveCell,
  isEditing,
  setIsEditing,
  onCommitValue,
  onPasteMulti,
  totalDays,
}: EditableNumberCellProps) {
  const isCellActive = activeCell?.day === day && activeCell?.field === field;
  const isCellEditing = isCellActive && isEditing;
  const [val, setVal] = React.useState(rawNum > 0 ? String(rawNum) : '');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isNavigatingRef = React.useRef(false);

  React.useEffect(() => {
    if (!isCellEditing) {
      setVal(rawNum > 0 ? String(rawNum) : '');
    }
  }, [rawNum, isCellEditing]);

  React.useLayoutEffect(() => {
    if (isCellEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (isCellActive) {
      containerRef.current?.focus();
    }
  }, [isCellActive, isCellEditing]);

  const commit = (str: string) => {
    const parsed = parseFloat(str.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      if (parsed !== rawNum) {
        onCommitValue(parsed);
      }
    } else if (!str.trim()) {
      if (rawNum !== 0) {
        onCommitValue(0);
      }
    }
  };

  const navigate = (direction: NavigationDirection) => {
    const next = getNextCell({ day, field }, direction, totalDays);
    if (next) {
      setActiveCell(next);
      setIsEditing(false);
    }
  };

  if (isCellEditing && canEdit) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            if (isNavigatingRef.current) {
              isNavigatingRef.current = false;
              return;
            }
            commit(val);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              isNavigatingRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate(e.shiftKey ? 'enter-up' : 'enter-down');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              isNavigatingRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate('down');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              isNavigatingRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate('up');
            } else if (e.key === 'ArrowRight') {
              const target = e.currentTarget;
              const isAllSelected = target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtEnd = target.selectionEnd === target.value.length;
              if (isAllSelected || isAtEnd) {
                e.preventDefault();
                isNavigatingRef.current = true;
                commit(val);
                setIsEditing(false);
                navigate('right');
              }
            } else if (e.key === 'ArrowLeft') {
              const target = e.currentTarget;
              const isAllSelected = target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtStart = target.selectionStart === 0;
              if (isAllSelected || isAtStart) {
                e.preventDefault();
                isNavigatingRef.current = true;
                commit(val);
                setIsEditing(false);
                navigate('left');
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              isNavigatingRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate(e.shiftKey ? 'prev' : 'next');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              isNavigatingRef.current = true;
              setVal(rawNum > 0 ? String(rawNum) : '');
              setIsEditing(false);
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            const lines = pasted.split(/\r\n|\n|\r/).map((l) => l.trim()).filter((l) => l.length > 0);
            if (lines.length > 1) {
              e.preventDefault();
              onPasteMulti(lines);
              setIsEditing(false);
            }
          }}
          className="h-full w-full bg-white dark:bg-zinc-900 px-0.5 text-center font-mono text-[12px] font-semibold text-foreground outline-none border-0 m-0 shadow-none ring-0 tabular-nums select-all"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={canEdit ? (isCellActive ? 0 : -1) : undefined}
      onClick={() => {
        if (!canEdit) return;
        setActiveCell({ day, field });
        setIsEditing(false);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        setActiveCell({ day, field });
        setIsEditing(true);
      }}
      onKeyDown={(e) => {
        if (!canEdit || !isCellActive) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigate('down');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigate('up');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigate('right');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigate('left');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          navigate(e.shiftKey ? 'enter-up' : 'enter-down');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          navigate(e.shiftKey ? 'prev' : 'next');
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onCommitValue(0);
        } else if (e.key === 'F2') {
          e.preventDefault();
          setIsEditing(true);
        } else if (/^[0-9.]$/.test(e.key)) {
          e.preventDefault();
          setVal(e.key);
          setIsEditing(true);
        }
      }}
      title={canEdit ? 'Nhấp để chọn ô, gõ để sửa' : undefined}
      className={cn(
        'relative flex h-full w-full items-center justify-center font-mono text-[12px] tabular-nums select-none outline-none transition-none px-0.5',
        canEdit && 'cursor-cell',
        className,
      )}
    >
      {displayNode}
    </div>
  );
}

interface EditableNoteCellProps {
  day: number;
  value: string;
  canEdit: boolean;
  activeCell: ActiveCell | null;
  setActiveCell: (cell: ActiveCell | null) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onCommitValue: (val: string) => void;
  totalDays: number;
  isSun?: boolean;
}

function EditableNoteCell({
  day,
  value,
  canEdit,
  activeCell,
  setActiveCell,
  isEditing,
  setIsEditing,
  onCommitValue,
  totalDays,
  isSun,
}: EditableNoteCellProps) {
  const isCellActive = activeCell?.day === day && activeCell?.field === 'note';
  const isCellEditing = isCellActive && isEditing;
  const [val, setVal] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isCellEditing) {
      setVal(value);
    }
  }, [value, isCellEditing]);

  React.useLayoutEffect(() => {
    if (isCellEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (isCellActive) {
      containerRef.current?.focus();
    }
  }, [isCellActive, isCellEditing]);

  const commit = (str: string) => {
    const trimmed = str.trim();
    if (trimmed !== (value || '').trim()) {
      onCommitValue(trimmed);
    }
  };

  const navigate = (direction: NavigationDirection) => {
    const next = getNextCell({ day, field: 'note' }, direction, totalDays);
    if (next) {
      setActiveCell(next);
      setIsEditing(false);
    }
  };

  if (isCellEditing && canEdit) {
    return (
      <div className="relative flex h-full w-full items-center">
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            commit(val);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(val);
              setIsEditing(false);
              navigate(e.shiftKey ? 'enter-up' : 'enter-down');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              commit(val);
              setIsEditing(false);
              navigate('down');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              commit(val);
              setIsEditing(false);
              navigate('up');
            } else if (e.key === 'ArrowRight') {
              const target = e.currentTarget;
              const isAllSelected = target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtEnd = target.selectionEnd === target.value.length;
              if (isAllSelected || isAtEnd) {
                e.preventDefault();
                commit(val);
                setIsEditing(false);
                navigate('right');
              }
            } else if (e.key === 'ArrowLeft') {
              const target = e.currentTarget;
              const isAllSelected = target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtStart = target.selectionStart === 0;
              if (isAllSelected || isAtStart) {
                e.preventDefault();
                commit(val);
                setIsEditing(false);
                navigate('left');
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              commit(val);
              setIsEditing(false);
              navigate(e.shiftKey ? 'prev' : 'next');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setVal(value);
              setIsEditing(false);
            }
          }}
          placeholder="Nhập ghi chú…"
          className="h-full w-full bg-white dark:bg-zinc-900 px-1.5 text-left font-sans text-[12px] text-foreground outline-none border-0 m-0 shadow-none ring-0 select-all"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={canEdit ? (isCellActive ? 0 : -1) : undefined}
      onClick={() => {
        if (!canEdit) return;
        setActiveCell({ day, field: 'note' });
        setIsEditing(false);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        setActiveCell({ day, field: 'note' });
        setIsEditing(true);
      }}
      onKeyDown={(e) => {
        if (!canEdit || !isCellActive) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigate('down');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigate('up');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigate('right');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigate('left');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          navigate(e.shiftKey ? 'enter-up' : 'enter-down');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          navigate(e.shiftKey ? 'prev' : 'next');
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onCommitValue('');
        } else if (e.key === 'F2') {
          e.preventDefault();
          setIsEditing(true);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setVal(e.key);
          setIsEditing(true);
        }
      }}
      title={canEdit ? 'Nhấp để chọn ô, gõ để sửa' : undefined}
      className={cn(
        'relative flex h-full w-full items-center justify-between gap-1 px-1.5 text-left text-[12px] select-none outline-none transition-none',
        canEdit && 'cursor-cell',
      )}
    >
      <span className={cn('truncate', value ? 'text-foreground font-normal' : isSun ? 'text-muted-foreground font-normal' : 'text-muted-foreground/30')}>
        {value || (isSun ? 'Nghỉ tuần' : '')}
      </span>
    </div>
  );
}


function isHeaderColActive(isRow2: boolean, index: number, field?: string | null): boolean {
  if (!field) return false;
  if (!isRow2) {
    if (index === 2) return field === 'checkInMorning' || field === 'checkOutMorning';
    if (index === 3) return field === 'checkInAfternoon' || field === 'checkOutAfternoon';
    if (index === 4) return field === 'breakHours' || field === 'personalBreakHours' || field === 'lunchDutyHours' || field === 'duty30kHours';
    if (index === 5) return field === 'workedHours';
    if (index === 6) return field === 'congChinh';
    if (index === 7) return field === 'otHours';
    if (index === 9) return field === 'nightShift';
    if (index === 10) return field === 'waterBooth';
    if (index === 11) return field === 'note';
    return false;
  }
  if (index === 0) return field === 'checkInMorning';
  if (index === 1) return field === 'checkOutMorning';
  if (index === 2) return field === 'checkInAfternoon';
  if (index === 3) return field === 'checkOutAfternoon';
  if (index === 4) return field === 'breakHours';
  if (index === 5) return field === 'personalBreakHours';
  if (index === 6) return field === 'lunchDutyHours';
  if (index === 7) return field === 'duty30kHours';
  if (index === 8) return field === 'workedHours';
  return false;
}

// ─── Main component ────────────────────────────────────────────────────

export function DetailSheet({
  period,
  employees,
  records,
  canEdit,
  onAdjust,
  onReload,
  navigatePeriod,
  onClosePeriod,
  onReopenPeriod,
  periodStatus,
}: DetailSheetProps) {
  const isPeriodOpen = periodStatus !== 'closed';

  const handleTogglePeriodStatus = React.useCallback(() => {
    if (isPeriodOpen) {
      if (onClosePeriod) onClosePeriod();
    } else {
      if (onReopenPeriod) onReopenPeriod();
    }
  }, [isPeriodOpen, onClosePeriod, onReopenPeriod]);

  const { selectedEmployee: selected, selectEmployee } = useEmployeeUrlSync({ employees });
  const [search, setSearch] = React.useState('');
  const [dept, setDept] = React.useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Optimistic local state for records
  const [localRecords, setLocalRecords] = React.useState<TimesheetWorkspaceRecord[]>(records);
  React.useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Active cell coordinate for Excel keyboard navigation
  const [activeCell, setActiveCell] = React.useState<ActiveCell | null>(null);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  React.useEffect(() => {
    setActiveCell(null);
    setIsEditing(false);
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
      list = list.filter((e) => e.fullName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q));
    }
    if (dept) list = list.filter((e) => e.departmentName === dept);
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees, search, dept]);

  const handleEmployeeKeyDown = React.useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = filtered[index + 1];
        if (next) {
          selectEmployee(next);
          const nextEl = document.getElementById(`emp-item-${next.id}`);
          nextEl?.focus();
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = filtered[index - 1];
        if (prev) {
          selectEmployee(prev);
          const prevEl = document.getElementById(`emp-item-${prev.id}`);
          prevEl?.focus();
        }
      }
    },
    [filtered, selectEmployee],
  );

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

  const isSelectedVerified = selected
    ? (verificationMap[selected.id] ?? selected.verificationStatus) === 'done'
    : false;

  const handleToggleVerifyEmployee = React.useCallback(async () => {
    if (!selected || !canEdit || isVerifying) return;
    const isVerified = (verificationMap[selected.id] ?? selected.verificationStatus) === 'done';
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
    } catch (err: any) {
      showToast.error(err?.message ?? 'Thao tác chốt công cá nhân thất bại');
    } finally {
      setIsVerifying(false);
    }
  }, [selected, canEdit, isVerifying, verificationMap, period, onReload]);

  const handlePrintIndividual = React.useCallback(() => {
    window.print();
  }, []);

  const handlePrintAll = React.useCallback(() => {
    showToast.info('Đang chuẩn bị in bảng công toàn bộ nhân viên…');
    setTimeout(() => {
      window.print();
    }, 300);
  }, []);

  const saveOverrideCell = React.useCallback(
    async (
      day: number,
      updates: {
        workedMinutes?: number;
        overtimeMinutes?: number;
        status?: string;
        note?: string;
        checkInMorning?: string | null;
        checkOutMorning?: string | null;
        checkInAfternoon?: string | null;
        checkOutAfternoon?: string | null;
        breakMinutes?: number | null;
        personalBreakMinutes?: number | null;
        lunchDutyMinutes?: number | null;
        duty30kMinutes?: number | null;
        nightShiftDutyCount?: number | null;
        waterBoothDutyCount?: number | null;
      },
    ) => {
      if (!selected || !canEdit) return;
      const wd = dayDate(period, day);
      const isSun = getDayOfWeek(wd) === 0;

      const curr = localRecords.find((r) => r.employeeId === selected.id && r.workDate === wd);

      const nextInM = updates.checkInMorning !== undefined ? updates.checkInMorning : curr?.checkInMorning;
      const nextOutM = updates.checkOutMorning !== undefined ? updates.checkOutMorning : curr?.checkOutMorning;
      const nextInA = updates.checkInAfternoon !== undefined ? updates.checkInAfternoon : curr?.checkInAfternoon;
      const nextOutA = updates.checkOutAfternoon !== undefined ? updates.checkOutAfternoon : curr?.checkOutAfternoon;
      const nextPersonal = updates.personalBreakMinutes !== undefined ? updates.personalBreakMinutes : curr?.personalBreakMinutes;
      const nextBreak = updates.breakMinutes !== undefined ? updates.breakMinutes : curr?.breakMinutes;
      const nextLunch = updates.lunchDutyMinutes !== undefined ? updates.lunchDutyMinutes : curr?.lunchDutyMinutes;
      const nextDuty35k = updates.duty30kMinutes !== undefined ? updates.duty30kMinutes : curr?.duty30kMinutes;

      const autoWorked = calculateWorkedMinutesFromPunches({
        checkInMorning: nextInM,
        checkOutMorning: nextOutM,
        checkInAfternoon: nextInA,
        checkOutAfternoon: nextOutA,
        personalBreakMinutes: nextPersonal,
        breakMinutes: nextBreak,
        lunchDutyMinutes: nextLunch,
        duty30kMinutes: nextDuty35k,
      });

      const nextWorked = updates.workedMinutes !== undefined
        ? updates.workedMinutes
        : (autoWorked !== null ? autoWorked : (curr?.workedMinutes ?? 0));

      const nextOt = updates.overtimeMinutes !== undefined
        ? updates.overtimeMinutes
        : (nextWorked >= 480 ? nextWorked - 480 : 0);

      const nextStatus =
        updates.status !== undefined
          ? updates.status
          : (nextWorked > 0 ? 'present' : (isSun ? 'off' : 'absent'));

      // 1. Optimistic update
      setLocalRecords((prev) => {
        const idx = prev.findIndex((r) => r.employeeId === selected.id && r.workDate === wd);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx]!,
            ...updates,
            workedMinutes: nextWorked,
            overtimeMinutes: nextOt,
            status: nextStatus,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              employeeId: selected.id,
              workDate: wd,
              status: nextStatus,
              checkIn: updates.checkInMorning ?? null,
              checkOut: updates.checkOutAfternoon ?? updates.checkOutMorning ?? null,
              checkInMorning: updates.checkInMorning ?? null,
              checkOutMorning: updates.checkOutMorning ?? null,
              checkInAfternoon: updates.checkInAfternoon ?? null,
              checkOutAfternoon: updates.checkOutAfternoon ?? null,
              breakMinutes: updates.breakMinutes ?? null,
              duty30kMinutes: updates.duty30kMinutes ?? null,
              workedMinutes: nextWorked,
              scheduledMinutes: 480,
              lateMinutes: 0,
              earlyLeaveMinutes: 0,
              overtimeMinutes: updates.overtimeMinutes ?? 0,
              personalBreakMinutes: updates.personalBreakMinutes ?? null,
              lunchDutyMinutes: updates.lunchDutyMinutes ?? null,
              nightShiftDutyCount: updates.nightShiftDutyCount ?? null,
              waterBoothDutyCount: updates.waterBoothDutyCount ?? null,
              isHoliday: isSun,
              note: updates.note ?? null,
            },
          ];
        }
      });

      // 2. Persist to backend
      setIsSaving(true);
      try {
        const payload: OverrideAttendanceSummaryDto = {
          employeeId: selected.id,
          workDate: wd,
          reason: 'manual_correction',
        };
        if (updates.checkInMorning != null) {
          payload.checkInMorning = updates.checkInMorning as unknown as OverrideAttendanceSummaryDto['checkInMorning'];
        }
        if (updates.checkOutMorning != null) {
          payload.checkOutMorning = updates.checkOutMorning as unknown as OverrideAttendanceSummaryDto['checkOutMorning'];
        }
        if (updates.checkInAfternoon != null) {
          payload.checkInAfternoon = updates.checkInAfternoon as unknown as OverrideAttendanceSummaryDto['checkInAfternoon'];
        }
        if (updates.checkOutAfternoon != null) {
          payload.checkOutAfternoon = updates.checkOutAfternoon as unknown as OverrideAttendanceSummaryDto['checkOutAfternoon'];
        }
        if (updates.breakMinutes != null) {
          payload.breakMinutes = updates.breakMinutes as unknown as OverrideAttendanceSummaryDto['breakMinutes'];
        }
        if (updates.personalBreakMinutes != null) {
          payload.personalBreakMinutes = updates.personalBreakMinutes as unknown as OverrideAttendanceSummaryDto['personalBreakMinutes'];
        }
        if (updates.lunchDutyMinutes != null) {
          payload.lunchDutyMinutes = updates.lunchDutyMinutes as unknown as OverrideAttendanceSummaryDto['lunchDutyMinutes'];
        }
        if (updates.duty30kMinutes != null) {
          payload.duty30kMinutes = updates.duty30kMinutes as unknown as OverrideAttendanceSummaryDto['duty30kMinutes'];
        }
        if (updates.nightShiftDutyCount != null) {
          payload.nightShiftDutyCount = updates.nightShiftDutyCount as unknown as OverrideAttendanceSummaryDto['nightShiftDutyCount'];
        }
        if (updates.waterBoothDutyCount != null) {
          payload.waterBoothDutyCount = updates.waterBoothDutyCount as unknown as OverrideAttendanceSummaryDto['waterBoothDutyCount'];
        }
        if (updates.workedMinutes !== undefined || autoWorked !== null) {
          const finalW = updates.workedMinutes ?? autoWorked ?? 0;
          payload.overriddenWorkedMinutes = finalW;
          payload.overriddenStatus = (finalW > 0 ? 'present' : (isSun ? 'off' : 'absent')) as OverrideAttendanceSummaryDto['overriddenStatus'];
        }
        if (updates.overtimeMinutes !== undefined) {
          payload.overriddenOvertimeMinutes = updates.overtimeMinutes;
        }
        if (updates.status !== undefined) {
          payload.overriddenStatus = updates.status as OverrideAttendanceSummaryDto['overriddenStatus'];
        }
        if (updates.note !== undefined) {
          payload.note = updates.note;
        }
        await timekeepingControllerOverrideAttendanceSummary(payload);
        if (selected && (verificationMap[selected.id] ?? selected.verificationStatus) === 'done') {
          setVerificationMap((prev) => ({ ...prev, [selected.id]: 'draft' }));
        }
      } catch (err: any) {
        showToast.error(err?.message ?? 'Lưu chấm công thất bại');
      } finally {
        setIsSaving(false);
      }
    },
    [selected, canEdit, period, localRecords, verificationMap],
  );

  const handlePasteMultiTime = React.useCallback(
    async (
      startDay: number,
      field: 'checkInMorning' | 'checkOutMorning' | 'checkInAfternoon' | 'checkOutAfternoon',
      lines: string[],
      totalDays: number,
    ) => {
      if (!selected || !canEdit || lines.length === 0) return;
      const count = Math.min(lines.length, totalDays - startDay + 1);

      try {
        for (let i = 0; i < count; i++) {
          const day = startDay + i;
          const timeStr = normalizeTimeString(lines[i] ?? '');
          await saveOverrideCell(day, { [field]: timeStr });
        }
        showToast.success(`Đã dán ${count} dòng giờ từ Excel`);
        if (onReload) await onReload();
      } catch (err: any) {
        showToast.error(err?.message || 'Có lỗi khi dán dữ liệu');
      }
    },
    [selected, canEdit, saveOverrideCell, onReload],
  );

  const handlePasteMultiNumber = React.useCallback(
    async (
      startDay: number,
      field:
        | 'workedHours'
        | 'congChinh'
        | 'otHours'
        | 'breakHours'
        | 'personalBreakHours'
        | 'lunchDutyHours'
        | 'duty30kHours'
        | 'nightShift'
        | 'waterBooth',
      lines: string[],
      totalDays: number,
    ) => {
      if (!selected || !canEdit || lines.length === 0) return;
      const count = Math.min(lines.length, totalDays - startDay + 1);

      try {
        for (let i = 0; i < count; i++) {
          const day = startDay + i;
          const lineStr = lines[i]?.replace(',', '.').trim() ?? '';
          const num = parseFloat(lineStr);
          if (isNaN(num) || num < 0) continue;

          if (field === 'workedHours') {
            await saveOverrideCell(day, { workedMinutes: Math.min(1440, Math.round(num * 60)) });
          } else if (field === 'congChinh') {
            await saveOverrideCell(day, { workedMinutes: Math.min(1440, Math.round(num * 480)) });
          } else if (field === 'otHours') {
            await saveOverrideCell(day, { overtimeMinutes: Math.min(1440, Math.round(num * 60)) });
          } else if (field === 'breakHours') {
            await saveOverrideCell(day, { breakMinutes: Math.round(num * 60) });
          } else if (field === 'personalBreakHours') {
            await saveOverrideCell(day, { personalBreakMinutes: Math.round(num * 60) });
          } else if (field === 'lunchDutyHours') {
            await saveOverrideCell(day, { lunchDutyMinutes: Math.round(num * 60) });
          } else if (field === 'duty30kHours') {
            await saveOverrideCell(day, { duty30kMinutes: Math.round(num * 60) });
          } else if (field === 'nightShift') {
            await saveOverrideCell(day, { nightShiftDutyCount: Math.round(num) });
          } else if (field === 'waterBooth') {
            await saveOverrideCell(day, { waterBoothDutyCount: Math.round(num) });
          }
        }
        showToast.success(`Đã dán ${count} dòng dữ liệu từ Excel`);
        if (onReload) await onReload();
      } catch (err: any) {
        showToast.error(err?.message || 'Có lỗi khi dán dữ liệu');
      }
    },
    [selected, canEdit, saveOverrideCell, onReload],
  );

  if (!selected || !selectedStats) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        Không có nhân viên nào trong kỳ công {period}
      </div>
    );
  }

  const s = selectedStats;
  const detailDays = Array.from({ length: s.totalDays }, (_, i) => i + 1);
  const recordByDate = new Map(localRecords.filter((r) => r.employeeId === selected.id).map((r) => [r.workDate, r]));


  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* ── Employee panel ── */}
      <aside
        aria-hidden={sidebarCollapsed}
        className={cn(
          'employee-sidebar-panel bg-card border-border flex min-h-0 flex-col overflow-hidden rounded-lg border shadow-xs mr-2.5 max-h-[780px] md:max-h-none print:hidden',
          sidebarCollapsed && 'collapsed',
        )}
      >
        <div className="employee-sidebar-inner flex h-full flex-col">
          {/* Month Navigator at Top of Sidebar */}
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-2 py-1.5 shrink-0 gap-1.5">
            <div className="inline-flex items-center rounded-md border border-border/70 bg-background shadow-2xs h-6 overflow-hidden">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigatePeriod && navigatePeriod(-1)}
                title="Tháng trước"
                className="h-6 px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded-none border-r border-border/50"
              >
                ← Trước
              </Button>
              <span className="px-1.5 font-mono text-[11px] font-bold text-foreground">
                {period}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigatePeriod && navigatePeriod(1)}
                title="Tháng sau"
                className="h-6 px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded-none border-l border-border/50"
              >
                Sau →
              </Button>
            </div>
            {/* Button Switch Đóng / Mở kỳ công */}
            <div className="inline-flex items-center gap-1.5 shrink-0 select-none">
              <span
                onClick={handleTogglePeriodStatus}
                className={cn(
                  'font-mono text-[10.5px] font-semibold cursor-pointer transition-colors',
                  isPeriodOpen
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-500 dark:text-zinc-400',
                )}
              >
                {isPeriodOpen ? 'Mở' : 'Đóng'}
              </span>
              <Switch
                id="period-status-switch"
                checked={isPeriodOpen}
                onCheckedChange={handleTogglePeriodStatus}
                title={
                  isPeriodOpen
                    ? 'Kỳ công đang Mở · Bấm để Đóng kỳ công'
                    : 'Kỳ công đang Đóng · Bấm để Mở lại kỳ công'
                }
                className={cn(
                  'h-4 w-7 cursor-pointer transition-colors',
                  isPeriodOpen
                    ? 'data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-500'
                    : 'data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-700',
                )}
              />
            </div>
          </div>

          <div className="border-b border-border/60 p-2 space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Danh sách nhân sự</span>
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-medium">
                {filtered.length}
              </Badge>
            </div>
            <div className="relative">
              <Icons.search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên / mã NV…"
                className="h-7 pl-8 pr-7 text-xs bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 p-0.5"
                >
                  <Icons.circleX className="size-3.5" />
                </button>
              )}
            </div>
            <Select value={dept || 'ALL'} onValueChange={(v) => setDept(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full h-7 text-xs bg-background">
                <SelectValue placeholder="Tất cả phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-1">
            {filtered.map((e, index) => {
              const st = employeeStatus(e, verificationMap);
              const on = e.id === selected.id;
              return (
                <button
                  key={e.id}
                  id={`emp-item-${e.id}`}
                  type="button"
                  onClick={() => selectEmployee(e)}
                  onKeyDown={(evt) => handleEmployeeKeyDown(evt, index)}
                  className={cn(
                    'group relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    on
                      ? 'bg-muted/70 text-foreground font-medium shadow-2xs border-l-[2.5px] border-l-zinc-900 dark:border-l-zinc-100'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border-l-[2.5px] border-l-transparent',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-[4px] font-mono text-[10.5px] font-bold border transition-colors',
                      on
                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-2xs'
                        : 'bg-muted/60 text-foreground/80 border-border/70 group-hover:bg-muted group-hover:text-foreground',
                    )}
                  >
                    {initials(e.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('block truncate text-xs font-semibold', on ? 'text-foreground' : 'text-foreground/90')}>
                        {e.fullName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                      <span className="font-mono">{e.employeeCode}</span>
                      <span>·</span>
                      <span className="truncate">{e.departmentName ?? 'Chưa gán phòng ban'}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="font-mono text-[11px] font-semibold text-foreground">
                      {e.workingDays}/{e.totalDays}
                    </span>
                    <StatusBadge status={st} mapping={statusMap} className="px-1.5 py-0 text-[9.5px]" />
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-muted-foreground px-2 py-8 text-center text-xs">Không tìm thấy nhân viên phù hợp</p>
            )}
          </div>
        </div>
      </aside>

      {/* ── Right workspace ── */}
      <section className="flex min-h-0 flex-1 flex-col gap-1.5 min-w-0 transition-all duration-300 ease-in-out">
        {/* Employee Profile & KPI Summary Card */}
        <div className="bg-card border-zinc-200 dark:border-zinc-800 flex flex-col rounded-lg border shadow-2xs overflow-hidden shrink-0">
          {/* Row 1: Profile Bar Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-[#f8f8f9] dark:bg-zinc-900 px-2.5 py-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="h-[26px] px-2 text-[11px] gap-1.5 font-medium text-foreground bg-card border-border/70 hover:bg-muted shrink-0"
                title="Thu gọn / mở rộng danh sách nhân sự"
              >
                <Icons.panelLeft className="size-3 text-foreground" />
                <span>Thu gọn</span>
              </Button>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium shrink-0">Tên nhân viên:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {selected.fullName}
                </span>
                <Badge variant="outline" className="font-mono text-[10px] font-semibold px-1 py-0 bg-muted/40 shrink-0">
                  {selected.employeeCode}
                </Badge>
                <span className="text-zinc-300 dark:text-zinc-600 shrink-0">·</span>
                <span className="text-zinc-500 dark:text-zinc-400 font-medium shrink-0">Bộ phận:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                  {selected.departmentName || 'Chưa gán phòng ban'}
                </span>
                <span className="text-zinc-300 dark:text-zinc-600 shrink-0">·</span>
                <span className="text-zinc-500 dark:text-zinc-400 font-medium shrink-0">LCB:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 shrink-0">
                  {formatVND(s.baseSalary)}
                </span>
                <span className="text-zinc-300 dark:text-zinc-600 shrink-0">·</span>
                <span className="text-zinc-500 dark:text-zinc-400 font-medium shrink-0">Đơn giá/ngày:</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">
                  {formatVND(s.ratePerDay)}
                </span>
              </div>
            </div>

            {/* Right: Status & Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 print:hidden">
              <StatusBadge status={employeeStatus(selected, verificationMap)} mapping={statusMap} className="px-1.5 py-0.5 text-[10px] rounded font-medium" />
              <Button
                type="button"
                variant={isSelectedVerified ? 'outline' : 'default'}
                size="sm"
                onClick={handleToggleVerifyEmployee}
                disabled={!canEdit || isVerifying || periodStatus === 'closed'}
                title={
                  isSelectedVerified
                    ? 'Mở chốt để chỉnh sửa bảng công nhân sự này'
                    : 'Chốt công cá nhân cho nhân sự này'
                }
                className={cn(
                  'h-[23px] px-2.5 text-[10.5px] gap-1 shadow-2xs font-semibold cursor-pointer transition-all',
                  isSelectedVerified
                    ? 'border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/40'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900',
                )}
              >
                {isVerifying ? (
                  <Spinner className="size-3" />
                ) : isSelectedVerified ? (
                  <IconLockOpen className="size-3.5" />
                ) : (
                  <IconLock className="size-3.5" />
                )}
                <span>
                  {isVerifying
                    ? (isSelectedVerified ? 'Đang mở…' : 'Đang chốt…')
                    : (isSelectedVerified ? 'Mở chốt' : 'Chốt cá nhân')}
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Tùy chọn In / Xuất PDF"
                    className="h-[23px] px-2 text-[10.5px] gap-1 shadow-2xs font-medium bg-card border-border/70 hover:bg-muted cursor-pointer"
                  >
                    <IconPrinter className="size-3 text-zinc-600 dark:text-zinc-400" />
                    <span>In / PDF</span>
                    <IconChevronDown className="size-2.5 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 text-xs">
                  <DropdownMenuItem onClick={handlePrintIndividual} className="gap-2 cursor-pointer text-xs">
                    <IconUser className="size-3.5 text-muted-foreground" />
                    <span>In cá nhân</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrintAll} className="gap-2 cursor-pointer text-xs">
                    <IconUsers className="size-3.5 text-muted-foreground" />
                    <span>In toàn bộ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Row 2: 2-Row Multi-Column KPI Slip Grid matching updated specifications */}
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <table className="kpi-slip-table w-full border-collapse table-fixed text-[11.5px] whitespace-nowrap min-w-[1180px] select-text">
              <colgroup>
                <col style={{ width: 80 }} />
                <col style={{ width: 38 }} />
                <col style={{ width: 85 }} />
                <col style={{ width: 82 }} />
                <col style={{ width: 38 }} />
                <col style={{ width: 85 }} />
                <col style={{ width: 82 }} />
                <col style={{ width: 46 }} />
                <col style={{ width: 95 }} />
                <col style={{ width: 72 }} />
                <col style={{ width: 46 }} />
                <col style={{ width: 78 }} />
                <col style={{ width: 82 }} />
                <col style={{ width: 85 }} />
                <col style={{ width: 76 }} />
                <col style={{ width: 38 }} />
                <col style={{ width: 95 }} />
              </colgroup>
              <tbody>
                {/* Dòng 1: Công chính -> Công Chủ nhật -> Trực trưa 25K -> Trực 35K -> Trách nhiệm -> Chuyên cần */}
                <tr>
                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Công chính:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs font-semibold tabular-nums text-foreground">{s.mainWork.toFixed(2)}</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs font-semibold tabular-nums text-foreground">{formatVND(s.mainWorkAmount)}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Công Chủ nhật:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{s.sundayWork.toFixed(2)}</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{formatVND(s.sundayWorkAmount)}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Trực trưa 25K:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{s.lunchDutyHours > 0 ? s.lunchDutyHours.toFixed(1) : '0.0'}</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{formatVND(s.noon25Amount)}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Trực 35K:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{s.duty35kHours > 0 ? s.duty35kHours.toFixed(1) : '0.0'}</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{formatVND(s.noon35Amount)}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Trách nhiệm:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{formatVND(s.responsibilityAmount)}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Chuyên cần:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{s.chuyenCan ? '1.00' : '0.00'}</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs font-semibold tabular-nums text-foreground">{formatVND(s.chuyenCanAmount)}</td>
                </tr>

                {/* Dòng 2: Giờ tăng ca -> Không đủ công -> Trực đêm -> Đứng nước -> BH + Công đoàn -> Tổng */}
                <tr>
                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Giờ tăng ca:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{s.otHours > 0 ? `${s.otHours.toFixed(1)}h` : '0.0h'}</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{formatVND(s.otAmount)}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Không đủ công:</td>
                  <td className={cn('border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums', s.deficitHours > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-500')}>{s.deficitHours > 0 ? `${s.deficitHours.toFixed(1)}h` : '0h'}</td>
                  <td className={cn('border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums', s.deficitAmount > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-foreground')}>{formatVND(s.deficitAmount)}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Trực đêm:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{s.night} đêm</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{formatVND(s.nightAmount)}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">Đứng nước:</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-foreground">{s.water} lần</td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums text-zinc-500">0 đ</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/60 px-1.5 py-[3px] text-xs text-zinc-600 dark:text-zinc-400 font-medium">BH + Công đoàn:</td>
                  <td className={cn('border border-zinc-300 dark:border-zinc-700 px-1.5 py-[3px] text-right font-mono text-xs tabular-nums font-medium', s.insuranceUnionSlipAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>{s.insuranceUnionSlipAmount > 0 ? `-${formatVND(s.insuranceUnionSlipAmount)}` : '0 đ'}</td>

                  <td className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-[3px] text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Tổng:</td>
                  <td colSpan={2} className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-[3px] text-right font-mono text-[13px] font-extrabold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{formatVND(s.totalNetSalary)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Table Container */}
        <div className="bg-card border-zinc-200 dark:border-zinc-800 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-xs">
          <div
            className="min-h-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-width:thin]"
          >
            <table className="timesheet-grid-table w-full border-separate border-spacing-0 table-fixed min-w-[1090px]">
              <colgroup>
                <col style={{ width: 44 }} />
                <col style={{ width: 44 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 62 }} />
                <col style={{ width: 62 }} />
                <col style={{ width: 62 }} />
                <col style={{ width: 62 }} />
                <col style={{ width: 44 }} />
                <col style={{ width: 44 }} />
                <col style={{ width: 70 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 64 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 140 }} />
              </colgroup>
              <TableHeader>
                {detailHeaderRows().map((row) => (
                  <TableRow key={row.isRow2 ? 'r2' : 'r1'} className="hover:bg-transparent border-0">
                    {row.cells.map((c, i) => {
                      const isStickyDate = !row.isRow2 && i === 0;
                      const isStickyDay = !row.isRow2 && i === 1;
                      const isColActive = isHeaderColActive(row.isRow2, i, activeCell?.field);

                      return (
                        <TableHead
                          key={`${row.isRow2 ? 'r2' : 'r1'}-${i}`}
                          colSpan={c.span}
                          rowSpan={c.rowSpan}
                          className={cn(
                            'border-b border-r border-zinc-300 dark:border-zinc-700 px-1 text-[11.5px] font-semibold text-zinc-700 dark:text-zinc-300 select-none normal-case tracking-normal',
                            row.isRow2
                              ? 'sticky top-[24px] z-20 h-[22px] text-[11px] bg-[#f8f8f9] dark:bg-zinc-900'
                              : 'sticky top-0 z-20 h-[24px] bg-[#f8f8f9] dark:bg-zinc-900',
                            isStickyDate && 'sticky left-0 top-0 z-30 bg-[#f8f8f9] dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold border-b border-r border-zinc-300 dark:border-zinc-700',
                            isStickyDay && 'sticky left-[44px] top-0 z-30 bg-[#f8f8f9] dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold border-b border-r border-zinc-300 dark:border-zinc-700',
                            isColActive && 'excel-col-active',
                            c.align === 'right' && 'text-right',
                            c.align === 'center' && 'text-center',
                            c.align === 'left' && 'text-left pl-2.5',
                            c.width,
                            c.className,
                          )}
                        >
                          <div className={cn(
                            'flex flex-col leading-tight',
                            c.align === 'left' ? 'items-start' : 'items-center justify-center'
                          )}>
                            <span>{c.label}</span>
                            {c.sub ? <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-normal lowercase tracking-normal">{c.sub}</span> : null}
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
                  const cong = worked < 240 ? 0 : worked < 480 ? 0.5 : 1.0;
                  const deficit = worked < 240 ? worked : worked < 480 ? worked - 240 : 0;
                  const otMinutes = (Number(r?.overtimeMinutes) || 0) > 0
                    ? Number(r?.overtimeMinutes)
                    : (worked >= 480 ? worked - 480 : 0);
                  const isRowActive = activeCell?.day === day;
                  const activeField = activeCell?.field;

                  return (
                    <TableRow
                      key={wd}
                      onClick={() => {
                        setActiveCell((prev) => (prev?.day === day ? prev : { day, field: prev?.field ?? 'checkInMorning' }));
                        setIsEditing(false);
                      }}
                      className={cn(
                        'group transition-none h-[22px]',
                        isRowActive && 'row-active',
                        isSun && 'row-sunday',
                      )}
                    >
                      {/* 0 Ngày (Frozen) */}
                      <TableCell
                        className={cn(
                          'group/date col-sticky-date sticky left-0 z-10 border-b border-r border-zinc-300 dark:border-zinc-700 p-0 h-[22px] text-center font-mono text-[12px] tabular-nums font-bold w-[44px] min-w-[44px] max-w-[44px] select-none',
                          isSun ? 'font-bold' : 'font-semibold',
                        )}
                        onDoubleClick={() => canEdit && onAdjust(selected, wd)}
                        title={canEdit ? 'Nhấp đúp để mở hộp thoại giải trình' : undefined}
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
                              className="opacity-0 group-hover/date:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                            >
                              <Icons.edit className="size-2" />
                            </button>
                          )}
                        </div>
                      </TableCell>

                      {/* 1 Thứ (Frozen) */}
                      <TableCell
                        className="col-sticky-day sticky left-[44px] z-10 border-b border-r border-zinc-300 dark:border-zinc-700 p-0 h-[22px] text-center font-mono text-[12px] w-[44px] min-w-[44px] max-w-[44px] select-none"
                      >
                        <div className="flex h-full w-full items-center justify-center">
                          {isSun ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              CN
                            </span>
                          ) : dow === 6 ? (
                            <span className="font-semibold text-foreground/80">T7</span>
                          ) : (
                            <span className="text-muted-foreground font-medium">{DAY_LABELS[dow]}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* 2-5 AM/PM times */}
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[56px] min-w-[56px] p-0 h-[22px]', activeField === 'checkInMorning' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'checkInMorning' && 'excel-active-cell')}>
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
                            saveOverrideCell(day, { checkInMorning: timeVal });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiTime(day, 'checkInMorning', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[56px] min-w-[56px] p-0 h-[22px]', activeField === 'checkOutMorning' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'checkOutMorning' && 'excel-active-cell')}>
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
                            saveOverrideCell(day, { checkOutMorning: timeVal });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiTime(day, 'checkOutMorning', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[56px] min-w-[56px] p-0 h-[22px]', activeField === 'checkInAfternoon' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'checkInAfternoon' && 'excel-active-cell')}>
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
                            saveOverrideCell(day, { checkInAfternoon: timeVal });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiTime(day, 'checkInAfternoon', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>
                      <TableCell className={cn('col-divider-r border-b border-r-2 text-center font-mono text-[12px] w-[56px] min-w-[56px] p-0 h-[22px]', activeField === 'checkOutAfternoon' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'checkOutAfternoon' && 'excel-active-cell')}>
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
                            saveOverrideCell(day, { checkOutAfternoon: timeVal });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiTime(day, 'checkOutAfternoon', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>

                      {/* 6-9 Lunch / Personal / Noon duties */}
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[62px] min-w-[62px] p-0 h-[22px]', activeField === 'breakHours' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'breakHours' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="breakHours"
                          rawNum={r?.breakMinutes ? Number((r.breakMinutes / 60).toFixed(1)) : 0}
                          displayNode={
                            <span className={r?.breakMinutes ? 'font-medium text-foreground' : 'text-muted-foreground/30'}>
                              {r?.breakMinutes ? (Number(r.breakMinutes) / 60).toFixed(1) : ''}
                            </span>
                          }
                          canEdit={canEdit}
                          activeCell={activeCell}
                          setActiveCell={setActiveCell}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          onCommitValue={(hours) => {
                            const mins = Math.round(hours * 60);
                            saveOverrideCell(day, { breakMinutes: mins });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'breakHours', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[62px] min-w-[62px] p-0 h-[22px]', activeField === 'personalBreakHours' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'personalBreakHours' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="personalBreakHours"
                          rawNum={r?.personalBreakMinutes ? Number((r.personalBreakMinutes / 60).toFixed(1)) : 0}
                          displayNode={
                            <span className={r?.personalBreakMinutes ? 'font-medium text-foreground' : 'text-muted-foreground/30'}>
                              {r?.personalBreakMinutes ? (Number(r.personalBreakMinutes) / 60).toFixed(1) : ''}
                            </span>
                          }
                          canEdit={canEdit}
                          activeCell={activeCell}
                          setActiveCell={setActiveCell}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          onCommitValue={(hours) => {
                            const mins = Math.round(hours * 60);
                            saveOverrideCell(day, { personalBreakMinutes: mins });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'personalBreakHours', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[62px] min-w-[62px] p-0 h-[22px]', activeField === 'lunchDutyHours' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'lunchDutyHours' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="lunchDutyHours"
                          rawNum={r?.lunchDutyMinutes ? Number((r.lunchDutyMinutes / 60).toFixed(1)) : 0}
                          displayNode={
                            <span className={r?.lunchDutyMinutes ? 'font-medium text-foreground' : 'text-muted-foreground/30'}>
                              {r?.lunchDutyMinutes ? (Number(r.lunchDutyMinutes) / 60).toFixed(1) : ''}
                            </span>
                          }
                          canEdit={canEdit}
                          activeCell={activeCell}
                          setActiveCell={setActiveCell}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          onCommitValue={(hours) => {
                            const mins = Math.round(hours * 60);
                            saveOverrideCell(day, { lunchDutyMinutes: mins });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'lunchDutyHours', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>
                      <TableCell className={cn('col-divider-r border-b border-r-2 text-center font-mono text-[12px] w-[62px] min-w-[62px] p-0 h-[22px]', activeField === 'duty30kHours' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'duty30kHours' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="duty30kHours"
                          rawNum={r?.duty30kMinutes ? Number((r.duty30kMinutes / 60).toFixed(1)) : 0}
                          displayNode={
                            <span className={r?.duty30kMinutes ? 'font-medium text-foreground' : 'text-muted-foreground/30'}>
                              {r?.duty30kMinutes ? (Number(r.duty30kMinutes) / 60).toFixed(1) : ''}
                            </span>
                          }
                          canEdit={canEdit}
                          activeCell={activeCell}
                          setActiveCell={setActiveCell}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          onCommitValue={(hours) => {
                            const mins = Math.round(hours * 60);
                            saveOverrideCell(day, { duty30kMinutes: mins });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'duty30kHours', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>

                      {/* 10-11 Tổng giờ làm (Giờ, Phút) */}
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] text-foreground w-[44px] min-w-[44px] p-0 h-[22px]', activeField === 'workedHours' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'workedHours' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="workedHours"
                          rawNum={worked > 0 ? Number((worked / 60).toFixed(1)) : 0}
                          displayNode={
                            <span className={cn('font-semibold', worked > 0 ? 'text-foreground' : 'text-muted-foreground/30')}>
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
                            saveOverrideCell(day, { workedMinutes: mins });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'workedHours', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>
                      <TableCell className={cn('col-divider-r border-b border-r-2 text-center font-mono text-[12px] tabular-nums w-[44px] min-w-[44px] p-0 h-[22px]', activeField === 'workedHours' && 'excel-col-active')}>
                        <div className="flex h-full w-full items-center justify-center">
                          {worked > 0 ? (
                            <span className="font-semibold text-foreground">{String(worked % 60).padStart(2, '0')}</span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* 12 Công chính */}
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[70px] min-w-[70px] p-0 h-[22px]', activeField === 'congChinh' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'congChinh' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="congChinh"
                          rawNum={cong}
                          displayNode={
                            <span className={cong >= 1 ? 'font-bold text-emerald-600 dark:text-emerald-400' : cong > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground/30'}>
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
                            saveOverrideCell(day, { workedMinutes: mins });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'congChinh', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>

                      {/* 13 Giờ tăng ca */}
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[56px] min-w-[56px] p-0 h-[22px]', activeField === 'otHours' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'otHours' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="otHours"
                          rawNum={otMinutes > 0 ? Number((otMinutes / 60).toFixed(1)) : 0}
                          displayNode={
                            <span className={otMinutes > 0 ? 'font-semibold text-sky-600 dark:text-sky-400' : 'text-muted-foreground/30'}>
                              {otMinutes > 0 ? fmtDuration(otMinutes) : '—'}
                            </span>
                          }
                          canEdit={canEdit}
                          activeCell={activeCell}
                          setActiveCell={setActiveCell}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          onCommitValue={(hours) => {
                            const mins = Math.round(hours * 60);
                            saveOverrideCell(day, { overtimeMinutes: mins });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'otHours', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>

                      {/* 14 Không đủ công */}
                      <TableCell className="border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] tabular-nums w-[64px] min-w-[64px] p-0 h-[22px]">
                        <div className="flex h-full w-full items-center justify-center">
                          {deficit > 0 ? (
                            <span className="inline-block rounded px-1 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-bold text-[11px] leading-tight">
                              {fmtDuration(deficit)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* 15 Trực đêm (lần) - Điền số */}
                      <TableCell className={cn('border-b border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-[12px] w-[56px] min-w-[56px] p-0 h-[22px]', activeField === 'nightShift' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'nightShift' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="nightShift"
                          rawNum={Number(r?.nightShiftDutyCount) || 0}
                          displayNode={
                            <span className={Number(r?.nightShiftDutyCount) > 0 ? 'font-bold text-foreground' : 'text-muted-foreground/30'}>
                              {Number(r?.nightShiftDutyCount) > 0 ? r?.nightShiftDutyCount : ''}
                            </span>
                          }
                          canEdit={canEdit}
                          activeCell={activeCell}
                          setActiveCell={setActiveCell}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          onCommitValue={(count) => {
                            saveOverrideCell(day, { nightShiftDutyCount: Math.round(count) });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'nightShift', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>

                      {/* 16 Đứng nước (lần) - Điền số */}
                      <TableCell className={cn('col-divider-r border-b border-r-2 text-center font-mono text-[12px] w-[56px] min-w-[56px] p-0 h-[22px]', activeField === 'waterBooth' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'waterBooth' && 'excel-active-cell')}>
                        <EditableNumberCell
                          day={day}
                          field="waterBooth"
                          rawNum={Number(r?.waterBoothDutyCount) || 0}
                          displayNode={
                            <span className={Number(r?.waterBoothDutyCount) > 0 ? 'font-bold text-foreground' : 'text-muted-foreground/30'}>
                              {Number(r?.waterBoothDutyCount) > 0 ? r?.waterBoothDutyCount : ''}
                            </span>
                          }
                          canEdit={canEdit}
                          activeCell={activeCell}
                          setActiveCell={setActiveCell}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          onCommitValue={(count) => {
                            saveOverrideCell(day, { waterBoothDutyCount: Math.round(count) });
                          }}
                          onPasteMulti={(lines) => handlePasteMultiNumber(day, 'waterBooth', lines, s.totalDays)}
                          totalDays={s.totalDays}
                        />
                      </TableCell>

                      {/* 17 Trạng thái & Ghi chú */}
                      <TableCell className={cn('w-[140px] min-w-[140px] p-0 h-[22px] align-middle border-b border-zinc-300 dark:border-zinc-700', activeField === 'note' && 'excel-col-active', activeCell?.day === day && activeCell?.field === 'note' && 'excel-active-cell')}>
                        <EditableNoteCell
                          day={day}
                          value={r?.note || ''}
                          canEdit={canEdit}
                          activeCell={activeCell}
                          setActiveCell={setActiveCell}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          onCommitValue={(str) => saveOverrideCell(day, { note: str })}
                          totalDays={s.totalDays}
                          isSun={isSun}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

              {/* Monthly Totals Footer */}
              <TableFooter className="sticky bottom-0 z-20 border-t-2 border-zinc-300 dark:border-zinc-700 bg-[#f8f8f9] dark:bg-zinc-900 shadow-[0_-2px_5px_-2px_rgba(0,0,0,0.08)]">
                <TableRow className="hover:bg-transparent font-bold">
                  <TableCell className="sticky left-0 bottom-0 z-30 bg-[#f8f8f9] dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 px-1 text-center font-mono text-[11px] tabular-nums w-[44px] min-w-[44px] max-w-[44px]">
                    Tổng
                  </TableCell>
                  <TableCell className="sticky left-[44px] bottom-0 z-30 bg-[#f8f8f9] dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 border-r-2 border-zinc-400 dark:border-zinc-600 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] px-1 text-center font-mono text-[11px] uppercase font-bold w-[44px] min-w-[44px] max-w-[44px]">
                    cộng
                  </TableCell>

                  {/* 4 AM/PM cols */}
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs text-muted-foreground/40 w-[56px] min-w-[56px] px-1">—</TableCell>
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs text-muted-foreground/40 w-[56px] min-w-[56px] px-1">—</TableCell>
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs text-muted-foreground/40 w-[56px] min-w-[56px] px-1">—</TableCell>
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r-2 border-zinc-400 dark:border-zinc-600 text-center font-mono text-xs text-muted-foreground/40 w-[56px] min-w-[56px] px-1">—</TableCell>

                  {/* 4 Break/Duty cols: Nghỉ trưa, Việc riêng, Trực trưa, Trực 35k */}
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs tabular-nums font-semibold text-foreground w-[62px] min-w-[62px] px-1">{s.breakHours > 0 ? s.breakHours.toFixed(1) : '—'}</TableCell>
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs tabular-nums font-semibold text-foreground w-[62px] min-w-[62px] px-1">{s.personalBreakHours > 0 ? s.personalBreakHours.toFixed(1) : '—'}</TableCell>
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs tabular-nums font-semibold text-foreground w-[62px] min-w-[62px] px-1">{s.lunchDutyHours > 0 ? s.lunchDutyHours.toFixed(1) : '—'}</TableCell>
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r-2 border-zinc-400 dark:border-zinc-600 text-center font-mono text-xs tabular-nums font-semibold text-foreground w-[62px] min-w-[62px] px-1">{s.duty35kHours > 0 ? s.duty35kHours.toFixed(1) : '—'}</TableCell>

                  {/* 2 Total Hours cols: Giờ / Phút */}
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs tabular-nums font-bold text-foreground w-[44px] min-w-[44px] px-1">{Math.floor(s.totHours)}</TableCell>
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r-2 border-zinc-400 dark:border-zinc-600 text-center font-mono text-xs tabular-nums font-bold text-foreground w-[44px] min-w-[44px] px-1">{String(Math.round((s.totHours % 1) * 60)).padStart(2, '0')}</TableCell>

                  {/* Công chính */}
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs tabular-nums font-bold text-emerald-600 dark:text-emerald-400 w-[70px] min-w-[70px] px-1 bg-emerald-500/10">
                    {s.mainWork.toFixed(1)}
                  </TableCell>

                  {/* Tăng ca */}
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs tabular-nums font-bold text-sky-600 dark:text-sky-400 w-[56px] min-w-[56px] px-1 bg-sky-500/10">
                    {s.otHours > 0 ? s.otHours.toFixed(1) : '—'}
                  </TableCell>

                  {/* Thiếu công */}
                  <TableCell className={cn('border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs tabular-nums font-bold w-[64px] min-w-[64px] px-1', s.deficitHours > 0 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'text-muted-foreground/40')}>
                    {s.deficitHours > 0 ? s.deficitHours.toFixed(1) : '—'}
                  </TableCell>

                  {/* Trực đêm */}
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs tabular-nums font-bold text-foreground w-[56px] min-w-[56px] px-1">
                    {s.night > 0 ? s.night : '—'}
                  </TableCell>

                  {/* Đứng nước */}
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 border-r-2 border-zinc-400 dark:border-zinc-600 text-center font-mono text-xs tabular-nums font-bold text-foreground w-[56px] min-w-[56px] px-1">
                    {s.water > 0 ? s.water : '—'}
                  </TableCell>

                  {/* Ghi chú */}
                  <TableCell className="border-b border-zinc-300 dark:border-zinc-700 px-1.5 text-xs text-muted-foreground font-normal italic w-[140px] min-w-[140px]">
                    {s.presentDays}/{s.totalDays} ngày đi làm
                  </TableCell>
                </TableRow>
              </TableFooter>
            </table>
          </div>

          {/* Legend & Shortcuts Bar */}
          <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200 dark:border-zinc-800 bg-[#f8f8f9] dark:bg-zinc-900 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-orange-500/20 border border-orange-500/40 inline-block" />
              <span>Chủ nhật</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-amber-500/20 border border-amber-500/30 inline-block" />
              <span>Thứ bảy</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-sky-500/20 border border-sky-500/30 inline-block" />
              <span>Tăng ca</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-amber-500/20 border border-amber-500/30 inline-block" />
              <span>Không đủ công</span>
            </span>
            <span className="ml-auto flex items-center gap-2 font-mono text-[10px] text-muted-foreground/70">
              <span><kbd className="rounded border bg-background px-1 py-0.5 text-[9px]">Tab</kbd> / <kbd className="rounded border bg-background px-1 py-0.5 text-[9px]">Mũi tên</kbd> chuyển ô</span>
              <span>·</span>
              <span><kbd className="rounded border bg-background px-1 py-0.5 text-[9px]">Enter</kbd> lưu</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}


