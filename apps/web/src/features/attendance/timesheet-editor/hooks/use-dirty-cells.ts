import { useState, useCallback, useRef } from 'react';
import { cellKey, type BatchRecord, type BatchSavePayload, type BatchSaveResponse, type DirtyCell, type FailedCell } from '../types';
import { showToast } from '@/lib/toast';

const BATCH_URL = '/api/v1/timekeeping/timesheets/batch';

export function useDirtyCells() {
  const [dirtyCells, setDirtyCells] = useState<Map<string, DirtyCell>>(new Map());
  const [failedCells, setFailedCells] = useState<FailedCell[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const setDirty = useCallback((employeeId: string, workDate: string, checkIn: string, checkOut: string) => {
    setDirtyCells((prev) => {
      const next = new Map(prev);
      const key = cellKey(employeeId, workDate);
      if (checkIn === '' && checkOut === '') {
        next.delete(key);
      } else {
        next.set(key, { checkIn, checkOut });
      }
      return next;
    });
  }, []);

  const isDirty = useCallback((employeeId: string, workDate: string): boolean => {
    return dirtyCells.has(cellKey(employeeId, workDate));
  }, [dirtyCells]);

  const resetDirty = useCallback(() => {
    setDirtyCells(new Map());
    setFailedCells([]);
  }, []);

  const clearFailed = useCallback(() => setFailedCells([]), []);

  const dirtyCount = dirtyCells.size;

  const save = useCallback(async (period: string): Promise<BatchSaveResponse | null> => {
    if (savingRef.current || dirtyCells.size === 0) return null;
    savingRef.current = true;
    setSaving(true);

    try {
      const records: BatchRecord[] = [];
      dirtyCells.forEach((cell, key) => {
        const [employeeId, workDate] = key.split('::');
        records.push({
          employeeId: employeeId!,
          workDate: workDate!,
          checkIn: cell.checkIn,
          checkOut: cell.checkOut,
        });
      });

      const payload: BatchSavePayload = { period, records };

      const res = await fetch(BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const parsed = JSON.parse(text);
          const errObj = parsed?.error ?? parsed;
          message = typeof errObj === 'string' ? errObj : (errObj?.message ?? parsed?.message ?? text);
        } catch { /* keep raw text */ }
        showToast.error(message);
        return { success: 0, failed: records.length, errors: [{ employeeId: '', workDate: '', reason: message }] };
      }

      const body = await res.json();
      const result: BatchSaveResponse = body.data ?? body;

      // Keep failed cells, remove successful ones
      setDirtyCells((prev) => {
        const next = new Map(prev);
        const failedKeys = new Set(result.errors.map((e) => cellKey(e.employeeId, e.workDate)));
        next.forEach((_, k) => {
          if (!failedKeys.has(k)) next.delete(k);
        });
        return next;
      });

      setFailedCells(result.errors);
      if (result.errors.length > 0) {
        showToast.error(`Lưu thất bại ${result.errors.length} ô.`, {
          description: result.errors.map((e) => `${e.workDate}: ${e.reason}`).join('; '),
        });
      }
      return result;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [dirtyCells]);

  return { dirtyCells, dirtyCount, failedCells, saving, setDirty, isDirty, resetDirty, clearFailed, save };
}
