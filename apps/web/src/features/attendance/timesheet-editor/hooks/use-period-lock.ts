import { useState, useCallback } from 'react';

const LOCKS_URL = '/api/v1/timekeeping/period-locks';

export function usePeriodLock() {
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const lock = useCallback(async (period: string, remarks?: string): Promise<boolean> => {
    setLocking(true);
    setLockError(null);
    try {
      const res = await fetch(`${LOCKS_URL}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, remarks }),
      });
      if (!res.ok) {
        const text = await res.text();
        setLockError(text);
        return false;
      }
      return true;
    } catch (err: any) {
      setLockError(err?.message ?? 'Failed to lock period');
      return false;
    } finally {
      setLocking(false);
    }
  }, []);

  const unlock = useCallback(async (period: string, remarks: string): Promise<boolean> => {
    setLocking(true);
    setLockError(null);
    try {
      const res = await fetch(`${LOCKS_URL}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, remarks }),
      });
      if (!res.ok) {
        const text = await res.text();
        setLockError(text);
        return false;
      }
      return true;
    } catch (err: any) {
      setLockError(err?.message ?? 'Failed to unlock period');
      return false;
    } finally {
      setLocking(false);
    }
  }, []);

  return { lock, unlock, locking, lockError, clearLockError: () => setLockError(null) };
}
