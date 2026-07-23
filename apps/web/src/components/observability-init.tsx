/**
 * Bootstraps observability (Sentry, web vitals, performance monitoring).
 * Fire-and-forget — doesn't block rendering.
 * Must be a client component for lifecycle access.
 */
'use client';

import { useEffect } from 'react';
import { initObservability } from '@/lib/observability/init';

export function ObservabilityInit() {
  useEffect(() => {
    void initObservability();
  }, []);

  return null;
}
