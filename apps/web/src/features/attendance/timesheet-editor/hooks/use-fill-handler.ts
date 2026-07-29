import { useState, useCallback, useRef } from 'react';
import { cellKey } from '../types';

interface FillState {
  sourceDate: string;
  field: 'checkIn' | 'checkOut';
  value: string;
}

export function useFillHandler(
  employeeId: string,
  canEdit: boolean,
  onCellChange: (employeeId: string, workDate: string, checkIn: string, checkOut: string) => void,
) {
  const [fillRange, setFillRange] = useState<{ from: number; to: number } | null>(null);
  const fillRef = useRef<FillState | null>(null);

  const onFillStart = useCallback(
    (date: string, field: 'checkIn' | 'checkOut', value: string) => {
      if (!canEdit || !value) return;
      const day = parseInt(date.split('-').pop()!, 10);
      fillRef.current = { sourceDate: date, field, value };
      setFillRange({ from: day, to: day });
    },
    [canEdit],
  );

  const onFillMove = useCallback(
    (day: number) => {
      if (!fillRef.current) return;
      setFillRange((prev) => {
        if (!prev) return { from: day, to: day };
        return { from: prev.from, to: day };
      });
    },
    [],
  );

  const onFillEnd = useCallback(
    (allDays: number, period: string) => {
      const state = fillRef.current;
      fillRef.current = null;
      setFillRange(null);
      if (!state) return;

      const range = { from: Math.min(parseInt(state.sourceDate.split('-').pop()!, 10), allDays), to: allDays };
      const startDay = parseInt(state.sourceDate.split('-').pop()!, 10);
      const targetStart = Math.min(startDay, startDay);
      const targetEnd = allDays;

      for (let d = targetStart; d <= targetEnd; d++) {
        const wd = `${period}-${String(d).padStart(2, '0')}`;
        if (state.field === 'checkIn') {
          onCellChange(employeeId, wd, state.value, '');
        } else {
          onCellChange(employeeId, wd, '', state.value);
        }
      }
    },
    [employeeId, onCellChange],
  );

  const isInRange = useCallback(
    (day: number) => {
      if (!fillRange) return false;
      const min = Math.min(fillRange.from, fillRange.to);
      const max = Math.max(fillRange.from, fillRange.to);
      return day >= min && day <= max;
    },
    [fillRange],
  );

  return { fillRange, isInRange, onFillStart, onFillMove, onFillEnd };
}
