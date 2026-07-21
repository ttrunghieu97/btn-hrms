/**
 * Observability bootstrap.
 * - Initializes web vitals + performance monitoring.
 * - Initializes Sentry (via @sentry/nextjs) if DSN configured.
 * - Initializes OpenTelemetry browser tracing with FetchInstrumentation when OTLP endpoint configured.
 *
 * Replaces the legacy axios-based instrumentation; the new FE uses native fetch
 * which is automatically instrumented by `@opentelemetry/instrumentation-fetch`.
 */

import { envClient } from '../env.client';
import { appLogger } from '../logger';
import { initPerformanceMonitoring } from '../performance';
import { initWebVitals } from './web-vitals';

export async function initObservability(): Promise<void> {
  void initWebVitals();
  initPerformanceMonitoring();
  // OBSERVABILITY_ENABLED removed — implied by SENTRY_DSN presence.
  // Client-side OTEL removed — not used.
  await initSentry();
}

async function initSentry(): Promise<void> {
  const dsn = envClient.sentryDsn;
  if (!dsn) return;

  try {
    const Sentry = await import('@sentry/nextjs');
    const integrations: unknown[] = [];

    const sentryTracingEnabled = envClient.sentryTracingEnabled;
    const tracesSampleRate = envClient.sentryTracesSampleRate;

    if (
      sentryTracingEnabled &&
      tracesSampleRate > 0 &&
      typeof Sentry.browserTracingIntegration === 'function'
    ) {
      integrations.push(Sentry.browserTracingIntegration());
    }

    const replayEnabled = envClient.sentryReplayEnabled;
    const replaySessionSampleRate = envClient.sentryReplaySessionSampleRate;
    const replayOnErrorSampleRate = envClient.sentryReplayOnErrorSampleRate;

    if (
      replayEnabled &&
      typeof Sentry.replayIntegration === 'function' &&
      (replaySessionSampleRate > 0 || replayOnErrorSampleRate > 0)
    ) {
      integrations.push(Sentry.replayIntegration());
    }

    Sentry.init({
      dsn,
      integrations: integrations as Parameters<typeof Sentry.init>[0]['integrations'],
      tracesSampleRate: sentryTracingEnabled ? tracesSampleRate : 0,
      replaysSessionSampleRate: replayEnabled ? replaySessionSampleRate : 0,
      replaysOnErrorSampleRate: replayEnabled ? replayOnErrorSampleRate : 0
    });

    appLogger.info('Sentry initialized');
  } catch (err) {
    appLogger.warn('Sentry init failed', {
      error: err instanceof Error ? err.message : String(err)
    });
  }
}

/** Client-side OpenTelemetry removed — not used. */

/**
 * Tag the active Sentry scope with the current authenticated user.
 * Pass `null` on logout to clear the user.
 */
export async function setSentryUser(
  user: { id: string | number; email?: string; username?: string } | null
): Promise<void> {
  try {
    const Sentry = await import('@sentry/nextjs');
    if (!user) {
      Sentry.setUser(null);
      return;
    }
    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      username: user.username
    });
  } catch {
    /* sentry not installed/initialized */
  }
}

/**
 * Tag the active Sentry scope with a request id (correlates to backend logs).
 */
export async function setSentryRequestId(requestId: string | null): Promise<void> {
  try {
    const Sentry = await import('@sentry/nextjs');
    if (!requestId) {
      Sentry.setTag('request_id', undefined as unknown as string);
      return;
    }
    Sentry.setTag('request_id', requestId);
  } catch {
    /* sentry not installed/initialized */
  }
}
