import { useState, useCallback } from 'react';
import { showToast } from '@/lib/toast';

const BASE_URL = '/api/v1/timekeeping/period-locks';

export function useVerifyEmployee(reload: () => Promise<void>) {
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const post = useCallback(async (period: string, employeeId: string, action: 'verify' | 'unverify') => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(`${BASE_URL}/${period}/employees/${employeeId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const parsed = JSON.parse(text);
          const errObj = parsed?.error ?? parsed;
          message = typeof errObj === 'string' ? errObj : (errObj?.message ?? parsed?.message ?? text);
        } catch { /* keep raw */ }
        setVerifyError(message);
        showToast.error(message);
        return false;
      }
      await reload();
      return true;
    } catch (err: any) {
      const msg = err?.message ?? `Failed to ${action} employee`;
      setVerifyError(msg);
      showToast.error(msg);
      return false;
    } finally {
      setVerifying(false);
    }
  }, [reload]);

  const verify = useCallback((period: string, employeeId: string) => post(period, employeeId, 'verify'), [post]);
  const unverify = useCallback((period: string, employeeId: string) => post(period, employeeId, 'unverify'), [post]);

  return { verify, unverify, verifying, verifyError, clearVerifyError: () => setVerifyError(null) };
}
