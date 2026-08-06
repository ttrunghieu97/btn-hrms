import { useState, useCallback } from 'react';
import { showToast } from '@/lib/toast';

const LOCKS_URL = '/api/v1/timekeeping/period-locks';

export function usePeriodLock() {
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const post = useCallback(async (endpoint: string, body: Record<string, unknown>): Promise<boolean> => {
    setLocking(true);
    setLockError(null);
    try {
      const res = await fetch(`${LOCKS_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const parsed = JSON.parse(text);
          const errObj = parsed?.error ?? parsed;
          message = typeof errObj === 'string' ? errObj : (errObj?.message ?? parsed?.message ?? text);
        } catch { /* keep raw text */ }
        setLockError(message);
        showToast.error(message);
        return false;
      }
      return true;
    } catch (err: any) {
      const msg = err?.message ?? `Failed to ${endpoint} period`;
      setLockError(msg);
      showToast.error(msg);
      return false;
    } finally {
      setLocking(false);
    }
  }, []);

  const lock = useCallback((period: string, remarks?: string) => post('lock', { period, remarks }), [post]);
  const unlock = useCallback((period: string, remarks: string) => post('unlock', { period, remarks }), [post]);
  const close = useCallback((period: string, remarks: string) => post('close', { period, remarks }), [post]);
  const reopen = useCallback((period: string, remarks: string) => post('reopen', { period, remarks }), [post]);
  const review = useCallback((period: string) => post('review', { period }), [post]);
  const approve = useCallback((period: string) => post('approve', { period }), [post]);

  return { lock, unlock, close, reopen, review, approve, locking, lockError, clearLockError: () => setLockError(null) };
}
