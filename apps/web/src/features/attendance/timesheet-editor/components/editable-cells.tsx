'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { fmtTime } from '../detail-columns';
import {
  type ActiveCell,
  type EditableField,
  type NavigationDirection,
  getNextCell,
  normalizeTimeString,
} from '../timesheet-calculations';

export interface EditableTimeCellProps {
  day: number;
  field: 'checkInMorning' | 'checkOutMorning' | 'checkInAfternoon' | 'checkOutAfternoon';
  value: string | null | undefined;
  canEdit: boolean;
  activeCell: ActiveCell | null;
  setActiveCell: (cell: ActiveCell | null) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onCommitValue: (val: string | null) => void;
  onPasteBlock: (day: number, field: EditableField, rawText: string) => void;
  onStartFillDrag?: (day: number, field: EditableField) => void;
  totalDays: number;
  className?: string;
}

export function EditableTimeCell({
  day,
  field,
  value,
  canEdit,
  activeCell,
  setActiveCell,
  isEditing,
  setIsEditing,
  onCommitValue,
  onPasteBlock,
  onStartFillDrag,
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
      <div className='relative flex h-full w-full items-center justify-center'>
        <input
          ref={inputRef}
          type='text'
          placeholder='08:00'
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
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
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
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
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
            if (pasted.includes('\t') || /\r\n|\n|\r/.test(pasted.trim())) {
              e.preventDefault();
              isNavigatingRef.current = true;
              onPasteBlock(day, field, pasted);
              setIsEditing(false);
            }
          }}
          className='bg-background text-foreground m-0 h-full w-full border-0 px-1 text-center text-xs font-semibold tabular-nums shadow-none ring-0 outline-none select-all'
        />
      </div>
    );
  }

  const formatted = fmtTime(value);
  const hasValue = formatted !== '-';

  return (
    <div
      ref={containerRef}
      role='button'
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
        } else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setVal(e.key);
          setIsEditing(true);
        }
      }}
      title={
        canEdit
          ? 'Nhấp chọn ô · Gõ số để sửa · Kéo góc phải dưới để sao chép · Ctrl+V để dán từ Excel'
          : undefined
      }
      className={cn(
        'relative flex h-full w-full items-center justify-center text-xs tabular-nums transition-none outline-none select-none',
        hasValue ? 'text-foreground font-medium' : 'text-muted-foreground/35',
        canEdit && 'cursor-cell',
        className,
      )}
    >
      <span>{hasValue ? formatted : '—'}</span>
      {isCellActive && canEdit && onStartFillDrag && (
        <span
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartFillDrag(day, field);
          }}
          title='Kéo xuống để sao chép nhanh (Tự bỏ qua Chủ nhật)'
          className='excel-fill-handle'
        />
      )}
    </div>
  );
}

export interface EditableNumberCellProps {
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
  onPasteBlock: (day: number, field: EditableField, rawText: string) => void;
  onStartFillDrag?: (day: number, field: EditableField) => void;
  totalDays: number;
}

export function EditableNumberCell({
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
  onPasteBlock,
  onStartFillDrag,
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
      <div className='relative flex h-full w-full items-center justify-center'>
        <input
          ref={inputRef}
          type='text'
          inputMode='decimal'
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
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
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
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
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
            if (pasted.includes('\t') || /\r\n|\n|\r/.test(pasted.trim())) {
              e.preventDefault();
              isNavigatingRef.current = true;
              onPasteBlock(day, field, pasted);
              setIsEditing(false);
            }
          }}
          className='bg-background text-foreground m-0 h-full w-full border-0 px-1 text-center text-xs font-semibold tabular-nums shadow-none ring-0 outline-none select-all'
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role='button'
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
        } else if (/^[0-9.]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setVal(e.key);
          setIsEditing(true);
        }
      }}
      title={
        canEdit
          ? 'Nhấp chọn ô · Gõ số để sửa · Kéo góc phải dưới để sao chép · Ctrl+V để dán từ Excel'
          : undefined
      }
      className={cn(
        'relative flex h-full w-full items-center justify-center px-0.5 text-xs tabular-nums transition-none outline-none select-none',
        canEdit && 'cursor-cell',
        className,
      )}
    >
      {displayNode}
      {isCellActive && canEdit && onStartFillDrag && (
        <span
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartFillDrag(day, field);
          }}
          title='Kéo xuống để sao chép nhanh'
          className='excel-fill-handle'
        />
      )}
    </div>
  );
}

export interface EditableNoteCellProps {
  day: number;
  value: string;
  canEdit: boolean;
  activeCell: ActiveCell | null;
  setActiveCell: (cell: ActiveCell | null) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onCommitValue: (val: string) => void;
  onPasteBlock: (day: number, field: EditableField, rawText: string) => void;
  onStartFillDrag?: (day: number, field: EditableField) => void;
  totalDays: number;
  isSun?: boolean;
}

export function EditableNoteCell({
  day,
  value,
  canEdit,
  activeCell,
  setActiveCell,
  isEditing,
  setIsEditing,
  onCommitValue,
  onPasteBlock,
  onStartFillDrag,
  totalDays,
  isSun,
}: EditableNoteCellProps) {
  const isCellActive = activeCell?.day === day && activeCell?.field === 'note';
  const isCellEditing = isCellActive && isEditing;
  const [val, setVal] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const skipNextBlurCommitRef = React.useRef(false);

  React.useEffect(() => {
    if (!isCellEditing) {
      setVal(value);
    }
  }, [value, isCellEditing]);

  React.useLayoutEffect(() => {
    if (isCellEditing) {
      skipNextBlurCommitRef.current = false;
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
      <div className='relative flex h-full w-full items-center'>
        <input
          ref={inputRef}
          type='text'
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            if (skipNextBlurCommitRef.current) {
              skipNextBlurCommitRef.current = false;
              return;
            }
            commit(val);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate(e.shiftKey ? 'enter-up' : 'enter-down');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate('down');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate('up');
            } else if (e.key === 'ArrowRight') {
              const target = e.currentTarget;
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtEnd = target.selectionEnd === target.value.length;
              if (isAllSelected || isAtEnd) {
                e.preventDefault();
                skipNextBlurCommitRef.current = true;
                commit(val);
                setIsEditing(false);
                navigate('right');
              }
            } else if (e.key === 'ArrowLeft') {
              const target = e.currentTarget;
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtStart = target.selectionStart === 0;
              if (isAllSelected || isAtStart) {
                e.preventDefault();
                skipNextBlurCommitRef.current = true;
                commit(val);
                setIsEditing(false);
                navigate('left');
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              commit(val);
              setIsEditing(false);
              navigate(e.shiftKey ? 'prev' : 'next');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              setVal(value);
              setIsEditing(false);
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted.includes('\t') || /\r\n|\n|\r/.test(pasted.trim())) {
              e.preventDefault();
              onPasteBlock(day, 'note', pasted);
              setIsEditing(false);
            }
          }}
          placeholder='Nhập ghi chú…'
          className='bg-background text-foreground m-0 h-full w-full border-0 px-2 text-left font-sans text-xs shadow-none ring-0 outline-none select-all'
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role='button'
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
      title={canEdit ? 'Nhấp để chọn ô · Gõ để sửa · Kéo góc phải dưới để sao chép' : undefined}
      className={cn(
        'relative flex h-full w-full items-center justify-between gap-1 px-2 text-left text-xs transition-none outline-none select-none',
        canEdit && 'cursor-cell',
      )}
    >
      <span
        className={cn(
          'truncate',
          value
            ? 'text-foreground font-normal'
            : isSun
              ? 'text-muted-foreground font-normal'
              : 'text-muted-foreground/30',
        )}
      >
        {value || (isSun ? 'Nghỉ tuần' : '')}
      </span>
      {isCellActive && canEdit && onStartFillDrag && (
        <span
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartFillDrag(day, 'note');
          }}
          title='Kéo xuống để sao chép ghi chú'
          className='excel-fill-handle'
        />
      )}
    </div>
  );
}
