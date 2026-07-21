/**
 * Web vitals collection — sends to optional collector endpoint via sendBeacon/fetch.
 * Uses dynamic import so the `web-vitals` package only loads when enabled.
 */

import { isDevAppEnv, isProdAppEnv } from '../app-env';
import { envClient } from '../env.client';
import { appLogger } from '../logger';

interface WebVitalsPayload {
  metric: string;
  value: number;
  rating: string;
  id: string;
  delta: number;
  page: string;
  timestamp: number;
}

interface WebVitalLike {
  name: string;
  value: number;
  rating: string;
  id: string;
  delta: number;
}

function buildPayload(metric: WebVitalLike): WebVitalsPayload {
  return {
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    delta: metric.delta,
    page: window.location.pathname,
    timestamp: Date.now()
  };
}

function sendMetric(payload: WebVitalsPayload) {
  const endpoint = envClient.webVitalsEndpoint;

  if (!endpoint) {
    if (isDevAppEnv) {
      appLogger.debug('WebVitals metric', payload as unknown as Record<string, unknown>);
    }
    return;
  }

  const body = JSON.stringify(payload);
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'application/json' }
  }).catch(() => {
    /* swallow telemetry errors */
  });
}

export async function initWebVitals(): Promise<void> {
  if (typeof window === 'undefined') return;
  const enabledByEnv = envClient.webVitalsEnabled;
  const enabled = enabledByEnv || isProdAppEnv;
  if (!enabled) return;

  try {
    const mod = (await import('web-vitals')) as unknown as {
      onCLS: (cb: (m: WebVitalLike) => void) => void;
      onFCP: (cb: (m: WebVitalLike) => void) => void;
      onINP: (cb: (m: WebVitalLike) => void) => void;
      onLCP: (cb: (m: WebVitalLike) => void) => void;
      onTTFB: (cb: (m: WebVitalLike) => void) => void;
    };

    const report = (metric: WebVitalLike) => {
      sendMetric(buildPayload(metric));
    };

    mod.onCLS(report);
    mod.onINP(report);
    mod.onLCP(report);
    mod.onFCP(report);
    mod.onTTFB(report);
  } catch (err) {
    appLogger.warn('web-vitals not available', {
      error: err instanceof Error ? err.message : String(err)
    });
  }
}
