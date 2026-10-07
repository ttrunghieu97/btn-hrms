'use client';

import { useEffect } from 'react';
import { appLogger } from '@/lib/logger';

/**
 * Global error handler.
 * Captures unhandled promise rejections and logs them with
 * structured context before React's default handler.
 */
export function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      const message = err instanceof Error ? err.message : String(err ?? 'unknown');
      const name = err instanceof Error ? err.name : 'UnhandledRejection';

      appLogger.error(`unhandled_rejection: ${name}`, {
        reason: message,
        stack: err instanceof Error ? (err.stack ?? '').split('\n').slice(0, 4).join(' | ') : undefined,
        type: typeof err,
      });
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return children;
}
