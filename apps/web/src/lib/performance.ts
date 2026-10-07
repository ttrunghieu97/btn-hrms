/**
 * Performance metrics: thresholds, classification, in-memory store, transport.
 * `emitPerformanceEvent` is called by `src/lib/fetcher.ts` and other instrumentation hooks.
 */

import { isDevAppEnv } from './app-env';
import { envClient } from './env.client';
import { appLogger } from './logger';
import { getRequestId } from './request-id';

export type PerformanceMetricType =
  | 'route_navigation'
  | 'loading_fallback'
  | 'render_commit'
  | 'render_loop'
  | 'query_latency'
  | 'fetch_latency'
  | 'ui_error';

export type PerformanceMetricStatus = 'success' | 'warning' | 'error';

export interface PerformanceMetric {
  id: string;
  type: PerformanceMetricType;
  status: PerformanceMetricStatus;
  durationMs?: number;
  timestamp: number;
  route: string;
  source: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceThresholds {
  routeSlowMs: number;
  fallbackSlowMs: number;
  renderSlowMs: number;
  querySlowMs: number;
  fetchSlowMs: number;
  renderLoopCount: number;
  renderLoopWindowMs: number;
}

export const performanceThresholds: PerformanceThresholds = {
  routeSlowMs: 1000,
  fallbackSlowMs: 600,
  renderSlowMs: 24,
  querySlowMs: 900,
  fetchSlowMs: 800,
  renderLoopCount: 8,
  renderLoopWindowMs: 1500
};

export function classifyDuration(
  type: PerformanceMetricType,
  durationMs?: number
): PerformanceMetricStatus {
  if (durationMs === undefined) return 'success';
  const slowThresholdByType: Partial<Record<PerformanceMetricType, number>> = {
    route_navigation: performanceThresholds.routeSlowMs,
    loading_fallback: performanceThresholds.fallbackSlowMs,
    render_commit: performanceThresholds.renderSlowMs,
    query_latency: performanceThresholds.querySlowMs,
    fetch_latency: performanceThresholds.fetchSlowMs
  };
  const threshold = slowThresholdByType[type];
  if (!threshold) return 'success';
  return durationMs >= threshold ? 'warning' : 'success';
}

const MAX_EVENTS = 200;
const events: PerformanceMetric[] = [];
const listeners = new Set<(event: PerformanceMetric) => void>();

interface PerformanceTransportConfig {
  enabled: boolean;
  endpoint?: string;
}

let transportConfig: PerformanceTransportConfig = { enabled: false };

export function configurePerformanceTransport(config: PerformanceTransportConfig) {
  transportConfig = config;
}

export function subscribePerformanceEvents(
  listener: (event: PerformanceMetric) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRecentPerformanceEvents(): PerformanceMetric[] {
  return [...events];
}

function createMetricId() {
  return getRequestId();
}

function currentRoutePath() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

export interface PerformanceEventInput {
  type: PerformanceMetricType;
  source: string;
  durationMs?: number;
  status?: PerformanceMetricStatus;
  message?: string;
  metadata?: Record<string, unknown>;
  route?: string;
}

export function createPerformanceEvent(input: PerformanceEventInput): PerformanceMetric {
  return {
    id: createMetricId(),
    type: input.type,
    status: input.status ?? classifyDuration(input.type, input.durationMs),
    durationMs: input.durationMs,
    message: input.message,
    route: input.route ?? currentRoutePath(),
    source: input.source,
    metadata: input.metadata,
    timestamp: Date.now()
  };
}

function sendPerformanceEvent(event: PerformanceMetric) {
  if (!transportConfig.enabled) return;
  const endpoint = transportConfig.endpoint;
  const body = JSON.stringify(event);

  if (!endpoint) {
    if (isDevAppEnv) {
      appLogger.debug('Performance metric', event as unknown as Record<string, unknown>);
    }
    return;
  }

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
    /* swallow non-critical telemetry errors */
  });
}

export function publishPerformanceEvent(event: PerformanceMetric) {
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  for (const listener of listeners) {
    listener(event);
  }
  sendPerformanceEvent(event);
}

export function emitPerformanceEvent(input: PerformanceEventInput) {
  publishPerformanceEvent(createPerformanceEvent(input));
}

export function startPerformanceSpan(
  type: PerformanceMetricType,
  source: string,
  baseMetadata?: Record<string, unknown>
) {
  const startedAt =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  const route = currentRoutePath();
  return {
    end(status?: PerformanceMetricStatus, metadata?: Record<string, unknown>) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      emitPerformanceEvent({
        type,
        source,
        route,
        durationMs: now - startedAt,
        status,
        metadata: { ...baseMetadata, ...metadata }
      });
    }
  };
}

export function initPerformanceMonitoring() {
  const enabled =
    envClient.performanceMonitoringEnabled || isDevAppEnv;
  const endpoint = envClient.performanceMetricsEndpoint;

  configurePerformanceTransport({ enabled, endpoint });

  appLogger.info('Performance monitoring initialized', {
    enabled,
    endpointConfigured: Boolean(endpoint)
  });
}
