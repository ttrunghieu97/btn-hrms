'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { fmtTime } from '../detail-columns';
import {
  type ActiveCell,
  type EditableField,
  type NavigationDirection,
  getNextCell,
  normalizeTimeString,
} from '../timesheet-calculations';

export type TimeCellField =
  | 'checkInMorning'
  | 'checkOutMorning'
  | 'checkInAfternoon'
  | 'checkOutAfternoon';

export type NumberCellField =
  | 'breakHours'
  | 'personalBreakHours'
  | 'lunchDutyHours'
  | 'duty30kHours'
  | 'nightShift'
  | 'waterBooth';

const INVALID_CHAR_TOOLTIP_TEXT = 'Chỉ chấp nhận giờ/số';

function useInvalidCharTooltip(isActive: boolean) {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState(INVALID_CHAR_TOOLTIP_TEXT);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  const trigger = React.useCallback((customMessage?: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setMessage(customMessage || INVALID_CHAR_TOOLTIP_TEXT);
    setVisible(true);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, 2200);
  }, []);

  React.useEffect(() => {
    if (!isActive && visible) {
      hide();
    }
  }, [isActive, visible, hide]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    showInvalidTooltip: visible && isActive,
    invalidTooltipMessage: message,
    triggerInvalidTooltip: trigger,
    hideInvalidTooltip: hide,
  };
}

function isImeOrInvalidKey(key: string, validPattern: RegExp): boolean {
  if (key === 'Process' || key === 'Dead' || key === 'Unidentified') {
    return true;
  }
  return key.length === 1 && !validPattern.test(key);
}

function InvalidInputTooltip({
  anchorRef,
  message = INVALID_CHAR_TOOLTIP_TEXT,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  day?: number;
  message?: string;
}) {
  const [, setTick] = React.useState(0);

  React.useLayoutEffect(() => {
    const updatePosition = () => setTick((t) => t + 1);
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef]);

  const baseEl = anchorRef.current;
  const el = (baseEl?.closest('td') as HTMLElement | null) ?? baseEl;
  const rect = el ? el.getBoundingClientRect() : null;
  const hasRect = Boolean(rect && (rect.width > 0 || rect.height > 0));
  const placeBelow = hasRect && rect ? rect.top < 40 : false;
  const coords =
    hasRect && rect
      ? {
          top: Math.round(placeBelow ? rect.bottom + 4 : rect.top - 4),
          left: Math.round(rect.left + rect.width / 2),
        }
      : null;

  const pillNode = (
    <div
      style={{
        backgroundColor: '#18181b',
        color: '#ffffff',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        lineHeight: '14px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
      className='flex items-center gap-1'
    >
      <svg
        aria-hidden='true'
        width='12'
        height='12'
        viewBox='0 0 16 16'
        fill='#fbbf24'
        style={{ flexShrink: 0, display: 'block' }}
      >
        <path d='M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z' />
      </svg>
      <span style={{ color: '#ffffff' }}>{message}</span>
    </div>
  );

  const arrowNode = (
    <svg
      aria-hidden='true'
      width='10'
      height='5'
      viewBox='0 0 10 5'
      style={{
        display: 'block',
        flexShrink: 0,
        marginTop: placeBelow ? 0 : -1,
        marginBottom: placeBelow ? -1 : 0,
        transform: placeBelow ? 'rotate(180deg)' : undefined,
      }}
    >
      <polygon points='0,0 10,0 5,5' fill='#18181b' />
    </svg>
  );

  const tooltipNode = (
    <div
      role='tooltip'
      data-testid='cell-invalid-tooltip'
      style={
        coords
          ? {
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: placeBelow
                ? 'translate(-50%, 0)'
                : 'translate(-50%, -100%)',
              zIndex: 9999,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.18))',
            }
          : {
              position: 'absolute',
              left: '50%',
              bottom: placeBelow ? undefined : 'calc(100% + 4px)',
              top: placeBelow ? 'calc(100% + 4px)' : undefined,
              transform: 'translateX(-50%)',
              zIndex: 9999,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.18))',
            }
      }
      className='flex flex-col items-center select-none'
    >
      {placeBelow ? (
        <>
          {arrowNode}
          {pillNode}
        </>
      ) : (
        <>
          {pillNode}
          {arrowNode}
        </>
      )}
    </div>
  );

  if (typeof document !== 'undefined' && coords) {
    return createPortal(tooltipNode, document.body);
  }
  return tooltipNode;
}

export interface EditableTimeCellProps {
  day: number;
  field: TimeCellField;
  value: string | null | undefined;
  canEdit: boolean;
  isCellActive: boolean;
  isMultiSelected?: boolean;
  setActiveCell: (cell: ActiveCell | null) => void;
  onCommitTime: (day: number, field: TimeCellField, val: string | null) => void;
  onPasteBlock: (day: number, field: EditableField, rawText: string) => void;
  onStartFillDrag?: (day: number, field: EditableField) => void;
  totalDays: number;
}

export const EditableTimeCell = React.memo(function EditableTimeCell({
  day,
  field,
  value,
  canEdit,
  isCellActive,
  isMultiSelected,
  setActiveCell,
  onCommitTime,
  onPasteBlock,
  onStartFillDrag,
  totalDays,
}: EditableTimeCellProps) {
  const initialDisplay = value ? fmtTime(value) : '';
  const defaultEditVal = initialDisplay === '-' ? '' : initialDisplay;
  const [isEditing, setIsEditing] = React.useState(false);
  if ((!isCellActive || isMultiSelected) && isEditing) {
    setIsEditing(false);
  }
  const isCellEditing = isCellActive && !isMultiSelected && isEditing;
  const [val, setVal] = React.useState(defaultEditVal);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isNavigatingRef = React.useRef(false);
  const justActivatedRef = React.useRef(false);
  const {
    showInvalidTooltip,
    invalidTooltipMessage,
    triggerInvalidTooltip,
    hideInvalidTooltip,
  } = useInvalidCharTooltip(isCellActive);

  React.useLayoutEffect(() => {
    if (!isCellActive) return;
    if (isCellEditing) {
      isNavigatingRef.current = false;
      const el = inputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    } else {
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [isCellActive, isCellEditing]);

  // Fallback window keydown listener when cell is active in view mode but DOM focus was lost (e.g. after drag selection)
  React.useEffect(() => {
    if (!isCellActive || isCellEditing || !canEdit) return;
    const onWinKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && containerRef.current?.contains(active)) return;
      const tag = active?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        active?.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        hideInvalidTooltip();
        if (isMultiSelected) {
          setActiveCell({ day, field });
        }
        setVal(e.key);
        setIsEditing(true);
      } else if (isImeOrInvalidKey(e.key, /^[0-9:]$/)) {
        e.preventDefault();
        containerRef.current?.focus({ preventScroll: true });
        triggerInvalidTooltip();
      }
    };
    window.addEventListener('keydown', onWinKeyDown);
    return () => window.removeEventListener('keydown', onWinKeyDown);
  }, [
    canEdit,
    day,
    field,
    hideInvalidTooltip,
    isCellActive,
    isCellEditing,
    isMultiSelected,
    setActiveCell,
    triggerInvalidTooltip,
  ]);

  const commit = (str: string): boolean => {
    const trimmed = str.trim();
    const currDisp = value ? fmtTime(value) : null;
    const cleanOrig = !currDisp || currDisp === '-' ? null : currDisp;
    if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === '0') {
      if (cleanOrig !== null) {
        onCommitTime(day, field, null);
      }
      return true;
    }
    const norm = normalizeTimeString(trimmed);
    if (!norm) {
      setVal(defaultEditVal);
      triggerInvalidTooltip('Giờ không hợp lệ (00:00 - 23:59)');
      return false;
    }
    if (norm !== cleanOrig) {
      onCommitTime(day, field, norm);
    }
    return true;
  };

  const navigate = (direction: NavigationDirection) => {
    const next = getNextCell({ day, field }, direction, totalDays);
    if (next) {
      setIsEditing(false);
      setActiveCell(next);
    }
  };

  if (isCellEditing && canEdit) {
    return (
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className='relative flex h-full w-full items-center justify-center'
      >
        <input
          ref={inputRef}
          type='text'
          value={val}
          onBeforeInput={(e) => {
            const data = (e as unknown as { data?: string | null }).data;
            if (data && /[^0-9:]/.test(data)) {
              e.preventDefault();
              triggerInvalidTooltip();
            }
          }}
          onChange={(e) => {
            const raw = e.target.value;
            if (/[^0-9:]/.test(raw)) {
              triggerInvalidTooltip();
              const cleaned = raw.replace(/[^0-9:]/g, '');
              if (cleaned.length > 0 || val.length === 0) {
                setVal(cleaned);
              }
            } else {
              if (raw.length > val.length) {
                hideInvalidTooltip();
              }
              setVal(raw);
            }
          }}
          onMouseDown={(e) => {
            if (e.detail > 1) {
              e.preventDefault();
            }
          }}
          onBlur={() => {
            if (isNavigatingRef.current) {
              isNavigatingRef.current = false;
              return;
            }
            const ok = commit(val);
            if (ok) {
              hideInvalidTooltip();
            }
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!commit(val)) return;
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              navigate(e.shiftKey ? 'enter-up' : 'enter-down');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!commit(val)) return;
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              navigate('down');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (!commit(val)) return;
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              navigate('up');
            } else if (e.key === 'ArrowRight') {
              const target = e.currentTarget;
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtEnd = target.selectionEnd === target.value.length;
              if (isAllSelected || isAtEnd) {
                e.preventDefault();
                if (!commit(val)) return;
                hideInvalidTooltip();
                isNavigatingRef.current = true;
                navigate('right');
              }
            } else if (e.key === 'ArrowLeft') {
              const target = e.currentTarget;
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtStart = target.selectionStart === 0;
              if (isAllSelected || isAtStart) {
                e.preventDefault();
                if (!commit(val)) return;
                hideInvalidTooltip();
                isNavigatingRef.current = true;
                navigate('left');
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              if (!commit(val)) return;
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              navigate(e.shiftKey ? 'prev' : 'next');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              setVal(initialDisplay === '-' ? '' : initialDisplay);
              setIsEditing(false);
            } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
              if (isImeOrInvalidKey(e.key, /^[0-9:]$/)) {
                e.preventDefault();
                triggerInvalidTooltip();
              } else if (/^[0-9:]$/.test(e.key)) {
                hideInvalidTooltip();
              }
            }
          }}
          onCompositionStart={() => {
            triggerInvalidTooltip();
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted.includes('\t') || /\r\n|\n|\r/.test(pasted)) {
              e.preventDefault();
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              onPasteBlock(day, field, pasted);
              setIsEditing(false);
            }
          }}
          className='text-foreground m-0 h-full w-full border-0 bg-transparent px-0 text-center text-xs font-medium tabular-nums shadow-none ring-0 outline-none'
        />
        {showInvalidTooltip && (
          <InvalidInputTooltip
            anchorRef={containerRef}
            day={day}
            message={invalidTooltipMessage}
          />
        )}
        {onStartFillDrag && (
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

  const formatted = initialDisplay || '-';
  const hasValue = formatted !== '-';

  return (
    <div
      ref={containerRef}
      role='button'
      tabIndex={canEdit ? (isCellActive ? 0 : -1) : undefined}
      onMouseDown={(e) => {
        if (e.button === 0) {
          justActivatedRef.current = !isCellActive || Boolean(isMultiSelected);
          if (canEdit) {
            containerRef.current?.focus({ preventScroll: true });
          }
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        if (isCellActive && !isMultiSelected && !justActivatedRef.current) {
          setVal(defaultEditVal);
          setIsEditing(true);
        } else {
          justActivatedRef.current = false;
          setActiveCell({ day, field });
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        justActivatedRef.current = false;
        setActiveCell({ day, field });
        setVal(defaultEditVal);
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
          onCommitTime(day, field, null);
        } else if (e.key === 'F2') {
          e.preventDefault();
          hideInvalidTooltip();
          if (isMultiSelected) {
            setActiveCell({ day, field });
          }
          setVal(defaultEditVal);
          setIsEditing(true);
        } else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          hideInvalidTooltip();
          if (isMultiSelected) {
            setActiveCell({ day, field });
          }
          setVal(e.key);
          setIsEditing(true);
        } else if (
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          isImeOrInvalidKey(e.key, /^[0-9:]$/)
        ) {
          e.preventDefault();
          triggerInvalidTooltip();
        }
      }}
      className={`relative flex h-full w-full items-center justify-center text-xs tabular-nums outline-none select-none ${
        hasValue ? 'text-foreground font-medium' : 'text-muted-foreground/35'
      } ${canEdit ? 'cursor-cell' : ''}`}
    >
      <span>{hasValue ? formatted : '—'}</span>
      {showInvalidTooltip && (
        <InvalidInputTooltip
          anchorRef={containerRef}
          day={day}
          message={invalidTooltipMessage}
        />
      )}
      {canEdit && onStartFillDrag && (
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
});

export interface EditableNumberCellProps {
  day: number;
  field: NumberCellField;
  rawNum: number;
  displayText: string;
  displayClassName?: string;
  canEdit: boolean;
  isCellActive: boolean;
  isMultiSelected?: boolean;
  setActiveCell: (cell: ActiveCell | null) => void;
  onCommitNumber: (day: number, field: NumberCellField, num: number) => void;
  onPasteBlock: (day: number, field: EditableField, rawText: string) => void;
  onStartFillDrag?: (day: number, field: EditableField) => void;
  totalDays: number;
}

export const EditableNumberCell = React.memo(function EditableNumberCell({
  day,
  field,
  rawNum,
  displayText,
  displayClassName,
  canEdit,
  isCellActive,
  isMultiSelected,
  setActiveCell,
  onCommitNumber,
  onPasteBlock,
  onStartFillDrag,
  totalDays,
}: EditableNumberCellProps) {
  const defaultEditVal = displayText || (rawNum > 0 ? String(rawNum) : '');
  const isBoldDisplay = displayClassName?.includes('font-semibold') ?? false;
  const isIntegerField = field === 'nightShift' || field === 'waterBooth';
  const maxAllowed = isIntegerField ? 10 : 24;
  const validStartKeyRegex = isIntegerField ? /^[0-9]$/ : /^[0-9.]$/;
  const validKeyRegex = isIntegerField ? /^[0-9]$/ : /^[0-9.,]$/;
  const invalidCharRegex = isIntegerField ? /[^0-9]/ : /[^0-9.,]/;
  const invalidCharReplaceRegex = isIntegerField ? /[^0-9]/g : /[^0-9.,]/g;
  const [isEditing, setIsEditing] = React.useState(false);
  if ((!isCellActive || isMultiSelected) && isEditing) {
    setIsEditing(false);
  }
  const isCellEditing = isCellActive && !isMultiSelected && isEditing;
  const [val, setVal] = React.useState(defaultEditVal);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isNavigatingRef = React.useRef(false);
  const justActivatedRef = React.useRef(false);
  const {
    showInvalidTooltip,
    invalidTooltipMessage,
    triggerInvalidTooltip,
    hideInvalidTooltip,
  } = useInvalidCharTooltip(isCellActive);

  React.useLayoutEffect(() => {
    if (!isCellActive) return;
    if (isCellEditing) {
      isNavigatingRef.current = false;
      const el = inputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    } else {
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [isCellActive, isCellEditing]);

  // Fallback window keydown listener when cell is active in view mode but DOM focus was lost (e.g. after drag selection)
  React.useEffect(() => {
    if (!isCellActive || isCellEditing || !canEdit) return;
    const onWinKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && containerRef.current?.contains(active)) return;
      const tag = active?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        active?.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (validStartKeyRegex.test(e.key)) {
        e.preventDefault();
        hideInvalidTooltip();
        if (isMultiSelected) {
          setActiveCell({ day, field });
        }
        setVal(e.key);
        setIsEditing(true);
      } else if (isImeOrInvalidKey(e.key, validKeyRegex)) {
        e.preventDefault();
        containerRef.current?.focus({ preventScroll: true });
        triggerInvalidTooltip(
          isIntegerField ? 'Chỉ chấp nhận số nguyên (0 - 10)' : undefined,
        );
      }
    };
    window.addEventListener('keydown', onWinKeyDown);
    return () => window.removeEventListener('keydown', onWinKeyDown);
  }, [
    canEdit,
    day,
    field,
    hideInvalidTooltip,
    isCellActive,
    isCellEditing,
    isIntegerField,
    isMultiSelected,
    setActiveCell,
    triggerInvalidTooltip,
    validKeyRegex,
    validStartKeyRegex,
  ]);

  const commit = (str: string): boolean => {
    const trimmed = str.trim();
    if (!trimmed || trimmed === '-' || trimmed === '—') {
      if (rawNum !== 0) {
        onCommitNumber(day, field, 0);
      }
      return true;
    }
    const parsed = parseFloat(trimmed.replace(',', '.'));
    if (
      isNaN(parsed) ||
      parsed < 0 ||
      parsed > maxAllowed ||
      (isIntegerField && !Number.isInteger(parsed))
    ) {
      setVal(defaultEditVal);
      triggerInvalidTooltip(
        isIntegerField
          ? 'Chỉ chấp nhận số nguyên (0 - 10)'
          : 'Số giờ tối đa trong ngày là 24',
      );
      return false;
    }
    if (parsed !== rawNum) {
      onCommitNumber(day, field, parsed);
    }
    return true;
  };

  const navigate = (direction: NavigationDirection) => {
    const next = getNextCell({ day, field }, direction, totalDays);
    if (next) {
      setIsEditing(false);
      setActiveCell(next);
    }
  };

  if (isCellEditing && canEdit) {
    return (
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className='relative flex h-full w-full items-center justify-center px-0.5'
      >
        <input
          ref={inputRef}
          type='text'
          inputMode={isIntegerField ? 'numeric' : 'decimal'}
          value={val}
          onBeforeInput={(e) => {
            const data = (e as unknown as { data?: string | null }).data;
            if (data && invalidCharRegex.test(data)) {
              e.preventDefault();
              triggerInvalidTooltip(
                isIntegerField ? 'Chỉ chấp nhận số nguyên (0 - 10)' : undefined,
              );
            }
          }}
          onChange={(e) => {
            const raw = e.target.value;
            if (invalidCharRegex.test(raw)) {
              triggerInvalidTooltip(
                isIntegerField ? 'Chỉ chấp nhận số nguyên (0 - 10)' : undefined,
              );
              const cleaned = raw.replace(invalidCharReplaceRegex, '');
              if (cleaned.length > 0 || val.length === 0) {
                setVal(cleaned);
              }
            } else {
              if (raw.length > val.length) {
                hideInvalidTooltip();
              }
              setVal(raw);
            }
          }}
          onMouseDown={(e) => {
            if (e.detail > 1) {
              e.preventDefault();
            }
          }}
          onBlur={() => {
            if (isNavigatingRef.current) {
              isNavigatingRef.current = false;
              return;
            }
            const ok = commit(val);
            if (ok) {
              hideInvalidTooltip();
            }
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!commit(val)) return;
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              navigate(e.shiftKey ? 'enter-up' : 'enter-down');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!commit(val)) return;
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              navigate('down');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (!commit(val)) return;
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              navigate('up');
            } else if (e.key === 'ArrowRight') {
              const target = e.currentTarget;
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtEnd = target.selectionEnd === target.value.length;
              if (isAllSelected || isAtEnd) {
                e.preventDefault();
                if (!commit(val)) return;
                hideInvalidTooltip();
                isNavigatingRef.current = true;
                navigate('right');
              }
            } else if (e.key === 'ArrowLeft') {
              const target = e.currentTarget;
              const isAllSelected =
                target.selectionStart === 0 && target.selectionEnd === target.value.length;
              const isAtStart = target.selectionStart === 0;
              if (isAllSelected || isAtStart) {
                e.preventDefault();
                if (!commit(val)) return;
                hideInvalidTooltip();
                isNavigatingRef.current = true;
                navigate('left');
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              if (!commit(val)) return;
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              navigate(e.shiftKey ? 'prev' : 'next');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              setVal(defaultEditVal);
              setIsEditing(false);
            } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
              if (isImeOrInvalidKey(e.key, validKeyRegex)) {
                e.preventDefault();
                triggerInvalidTooltip(
                  isIntegerField ? 'Chỉ chấp nhận số nguyên (0 - 10)' : undefined,
                );
              } else if (validKeyRegex.test(e.key)) {
                hideInvalidTooltip();
              }
            }
          }}
          onCompositionStart={() => {
            triggerInvalidTooltip();
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted.includes('\t') || /\r\n|\n|\r/.test(pasted)) {
              e.preventDefault();
              hideInvalidTooltip();
              isNavigatingRef.current = true;
              onPasteBlock(day, field, pasted);
              setIsEditing(false);
            }
          }}
          className={`text-foreground m-0 h-full w-full border-0 bg-transparent px-0 text-center text-xs tabular-nums shadow-none ring-0 outline-none ${
            isBoldDisplay ? 'font-semibold' : 'font-medium'
          }`}
        />
        {showInvalidTooltip && (
          <InvalidInputTooltip
            anchorRef={containerRef}
            day={day}
            message={invalidTooltipMessage}
          />
        )}
        {onStartFillDrag && (
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

  return (
    <div
      ref={containerRef}
      role='button'
      tabIndex={canEdit ? (isCellActive ? 0 : -1) : undefined}
      onMouseDown={(e) => {
        if (e.button === 0) {
          justActivatedRef.current = !isCellActive || Boolean(isMultiSelected);
          if (canEdit) {
            containerRef.current?.focus({ preventScroll: true });
          }
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        if (isCellActive && !isMultiSelected && !justActivatedRef.current) {
          setVal(defaultEditVal);
          setIsEditing(true);
        } else {
          justActivatedRef.current = false;
          setActiveCell({ day, field });
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        justActivatedRef.current = false;
        setActiveCell({ day, field });
        setVal(defaultEditVal);
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
          onCommitNumber(day, field, 0);
        } else if (e.key === 'F2') {
          e.preventDefault();
          hideInvalidTooltip();
          if (isMultiSelected) {
            setActiveCell({ day, field });
          }
          setVal(defaultEditVal);
          setIsEditing(true);
        } else if (validStartKeyRegex.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          hideInvalidTooltip();
          if (isMultiSelected) {
            setActiveCell({ day, field });
          }
          setVal(e.key);
          setIsEditing(true);
        } else if (
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          isImeOrInvalidKey(e.key, validKeyRegex)
        ) {
          e.preventDefault();
          triggerInvalidTooltip(
            isIntegerField ? 'Chỉ chấp nhận số nguyên (0 - 10)' : undefined,
          );
        }
      }}
      className={`relative flex h-full w-full items-center justify-center px-0.5 text-xs tabular-nums outline-none select-none ${
        canEdit ? 'cursor-cell' : ''
      }`}
    >
      <span className={displayClassName}>{displayText}</span>
      {showInvalidTooltip && (
        <InvalidInputTooltip
          anchorRef={containerRef}
          day={day}
          message={invalidTooltipMessage}
        />
      )}
      {canEdit && onStartFillDrag && (
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
});

export interface EditableNoteCellProps {
  day: number;
  value: string;
  canEdit: boolean;
  isCellActive: boolean;
  isMultiSelected?: boolean;
  setActiveCell: (cell: ActiveCell | null) => void;
  onCommitNote: (day: number, val: string) => void;
  onPasteBlock: (day: number, field: EditableField, rawText: string) => void;
  onStartFillDrag?: (day: number, field: EditableField) => void;
  totalDays: number;
}

export const EditableNoteCell = React.memo(function EditableNoteCell({
  day,
  value,
  canEdit,
  isCellActive,
  isMultiSelected,
  setActiveCell,
  onCommitNote,
  onPasteBlock,
  onStartFillDrag,
  totalDays,
}: EditableNoteCellProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  if ((!isCellActive || isMultiSelected) && isEditing) {
    setIsEditing(false);
  }
  const isCellEditing = isCellActive && !isMultiSelected && isEditing;
  const [val, setVal] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const skipNextBlurCommitRef = React.useRef(false);
  const justActivatedRef = React.useRef(false);

  React.useLayoutEffect(() => {
    if (!isCellActive) return;
    if (isCellEditing) {
      skipNextBlurCommitRef.current = false;
      const el = inputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    } else {
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [isCellActive, isCellEditing]);

  // Fallback window keydown listener when cell is active in view mode but DOM focus was lost
  React.useEffect(() => {
    if (!isCellActive || isCellEditing || !canEdit) return;
    const onWinKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && containerRef.current?.contains(active)) return;
      const tag = active?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        active?.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'F2') {
        e.preventDefault();
        if (isMultiSelected) {
          setActiveCell({ day, field: 'note' });
        }
        setVal(value);
        setIsEditing(true);
      } else if (e.key.length === 1) {
        e.preventDefault();
        if (isMultiSelected) {
          setActiveCell({ day, field: 'note' });
        }
        setVal(e.key);
        setIsEditing(true);
      }
    };
    window.addEventListener('keydown', onWinKeyDown);
    return () => window.removeEventListener('keydown', onWinKeyDown);
  }, [canEdit, day, isCellActive, isCellEditing, isMultiSelected, setActiveCell, value]);

  const commit = (str: string) => {
    const trimmed = str.trim();
    if (trimmed !== (value || '').trim()) {
      onCommitNote(day, trimmed);
    }
  };

  const navigate = (direction: NavigationDirection) => {
    const next = getNextCell({ day, field: 'note' }, direction, totalDays);
    if (next) {
      setIsEditing(false);
      setActiveCell(next);
    }
  };

  if (isCellEditing && canEdit) {
    return (
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className='relative flex h-full w-full items-center'
      >
        <input
          ref={inputRef}
          type='text'
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onMouseDown={(e) => {
            if (e.detail > 1) {
              e.preventDefault();
            }
          }}
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
              navigate(e.shiftKey ? 'enter-up' : 'enter-down');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              commit(val);
              navigate('down');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              commit(val);
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
                navigate('left');
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              commit(val);
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
            if (pasted.includes('\t') || /\r\n|\n|\r/.test(pasted)) {
              e.preventDefault();
              skipNextBlurCommitRef.current = true;
              onPasteBlock(day, 'note', pasted);
              setIsEditing(false);
            }
          }}
          className='text-foreground m-0 h-full w-full border-0 bg-transparent px-2 text-left font-sans text-xs font-normal shadow-none ring-0 outline-none'
        />
        {onStartFillDrag && (
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

  return (
    <div
      ref={containerRef}
      role='button'
      tabIndex={canEdit ? (isCellActive ? 0 : -1) : undefined}
      onMouseDown={(e) => {
        if (e.button === 0) {
          justActivatedRef.current = !isCellActive || Boolean(isMultiSelected);
          if (canEdit) {
            containerRef.current?.focus({ preventScroll: true });
          }
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        if (isCellActive && !isMultiSelected && !justActivatedRef.current) {
          setVal(value);
          setIsEditing(true);
        } else {
          justActivatedRef.current = false;
          setActiveCell({ day, field: 'note' });
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!canEdit) return;
        justActivatedRef.current = false;
        setActiveCell({ day, field: 'note' });
        setVal(value);
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
          onCommitNote(day, '');
        } else if (e.key === 'F2') {
          e.preventDefault();
          if (isMultiSelected) {
            setActiveCell({ day, field: 'note' });
          }
          setVal(value);
          setIsEditing(true);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          if (isMultiSelected) {
            setActiveCell({ day, field: 'note' });
          }
          setVal(e.key);
          setIsEditing(true);
        }
      }}
      className={`relative flex h-full w-full items-center justify-between gap-1 px-2 text-left text-xs outline-none select-none ${
        canEdit ? 'cursor-cell' : ''
      }`}
    >
      <span
        className={`truncate ${
          value
            ? 'text-foreground font-normal'
            : 'text-muted-foreground/30'
        }`}
      >
        {value}
      </span>
      {canEdit && onStartFillDrag && (
        <span
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartFillDrag(day, 'note');
          }}
          title='Kéo xuống để sao chép nhanh'
          className='excel-fill-handle'
        />
      )}
    </div>
  );
});
