import { useState, useCallback } from 'react';
import {
  timekeepingControllerApprovePeriod,
  timekeepingControllerClosePeriod,
  timekeepingControllerLockPeriod,
  timekeepingControllerReopenPeriod,
  timekeepingControllerReviewPeriod,
  timekeepingControllerUnlockPeriod,
} from '@/api/generated/attendance-timekeeping/attendance-timekeeping';
import { showToast } from '@/lib/toast';

export function usePeriodLock() {
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const runAction = useCallback(async (actionName: string, fn: () => Promise<unknown>): Promise<boolean> => {
    setLocking(true);
    setLockError(null);
    try {
      await fn();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${actionName} period`;
      setLockError(msg);
      showToast.error(msg);
      return false;
    } finally {
      setLocking(false);
    }
  }, []);

  const lock = useCallback(
    (period: string, remarks?: string) =>
      runAction('lock', () => timekeepingControllerLockPeriod({ period, remarks })),
    [runAction]
  );
  const unlock = useCallback(
    (period: string, remarks: string) =>
      runAction('unlock', () => timekeepingControllerUnlockPeriod({ period, remarks })),
    [runAction]
  );
  const close = useCallback(
    (period: string, remarks: string) =>
      runAction('close', () => timekeepingControllerClosePeriod({ period, remarks })),
    [runAction]
  );
  const reopen = useCallback(
    (period: string, remarks: string) =>
      runAction('reopen', () => timekeepingControllerReopenPeriod({ period, remarks })),
    [runAction]
  );
  const review = useCallback(
    (period: string) =>
      runAction('review', () => timekeepingControllerReviewPeriod({ period })),
    [runAction]
  );
  const approve = useCallback(
    (period: string) =>
      runAction('approve', () => timekeepingControllerApprovePeriod({ period })),
    [runAction]
  );

  return { lock, unlock, close, reopen, review, approve, locking, lockError, clearLockError: () => setLockError(null) };
}
