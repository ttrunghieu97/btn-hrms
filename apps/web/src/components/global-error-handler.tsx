'use client';

import { useEffect } from 'react';
import { appLogger } from '@/lib/logger';

if (typeof window !== 'undefined' && typeof window.performance?.measure === 'function') {
  const perf = window.performance as Performance & { __safeMeasurePatched?: boolean };
  if (!perf.__safeMeasurePatched) {
    const origMeasure = perf.measure.bind(perf);
    perf.measure = ((
      name: string,
      startOrOptions?: string | PerformanceMeasureOptions,
      endMark?: string,
    ) => {
      let normalizedOptions = startOrOptions;
      if (normalizedOptions && typeof normalizedOptions === 'object') {
        const rawStart = normalizedOptions.start;
        const rawEnd = normalizedOptions.end;
        const safeStart =
          typeof rawStart === 'number'
            ? Number.isFinite(rawStart) && rawStart >= 0
              ? rawStart
              : 0
            : rawStart;
        const safeEnd =
          typeof rawEnd === 'number'
            ? Number.isFinite(rawEnd) && rawEnd >= 0
              ? Math.max(typeof safeStart === 'number' ? safeStart : 0, rawEnd)
              : typeof safeStart === 'number'
                ? safeStart
                : 0
            : rawEnd;
        normalizedOptions = { ...normalizedOptions, start: safeStart, end: safeEnd };
      }
      try {
        return origMeasure(name, normalizedOptions as PerformanceMeasureOptions, endMark);
      } catch {
        return undefined as unknown as PerformanceMeasure;
      }
    }) as typeof perf.measure;
    perf.__safeMeasurePatched = true;
  }
}

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
