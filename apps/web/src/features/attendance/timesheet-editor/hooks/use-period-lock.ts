import { useState, useCallback } from 'react';

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
        setLockError(text);
        return false;
      }
      return true;
    } catch (err: any) {
      setLockError(err?.message ?? `Failed to ${endpoint} period`);
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
