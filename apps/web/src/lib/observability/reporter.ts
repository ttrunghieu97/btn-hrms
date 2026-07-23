/**
 * Observability reporter — abstraction over Sentry.
 *
 * Rules:
 * - Components/hooks call reportError/reportWarning/reportMessage only.
 * - Never import @sentry/nextjs outside this file + init.ts (which owns scope tagging).
 * - Console adapter always fires. Sentry adapter fires only if SDK initialized.
 *
 * Adapter pattern: replace SentryAdapter with OTEL/Datadog adapter later.
 */

import * as Sentry from '@sentry/nextjs';
import { appLogger } from '../logger';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ReportContext {
  /** Feature domain, e.g. "employees", "attendance" */
  feature?: string;
  /** Action being performed, e.g. "create", "fetch" */
  action?: string;
  /** Severity classification for dashboard filtering */
  severity?: ReportSeverity;
  /** Current route path, e.g. "/employees/create" */
  route?: string;
  /** Authenticated user role at time of event */
  userRole?: string;
  /** Tags indexed for search/filter in Sentry (string values only) */
  tags?: Record<string, string>;
  /** Extra non-indexed metadata */
  extra?: Record<string, unknown>;
}

function isSentryActive(): boolean {
  try {
    return !!Sentry.getClient?.();
  } catch {
    return false;
  }
}

/**
 * Report an error.
 * - Console: always writes structured error log.
 * - Sentry: sends exception if initialized.
 */
export function reportError(error: unknown, context?: ReportContext): void {
  const err = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

  // Console adapter — always
  appLogger.error(`[Observability] ${err.name}: ${err.message}`, {
    feature: context?.feature,
    action: context?.action,
    severity: context?.severity,
    route: context?.route,
    userRole: context?.userRole,
    ...context?.extra,
  });

  // Sentry adapter — only if SDK initialized
  if (!isSentryActive()) return;

  const tags: Record<string, string> = {
    ...(context?.feature ? { feature: context.feature } : {}),
    ...(context?.action ? { action: context.action } : {}),
    ...(context?.severity ? { severity: context.severity } : {}),
    ...(context?.route ? { route: context.route } : {}),
    ...(context?.userRole ? { user_role: context.userRole } : {}),
    ...context?.tags,
  };

  Sentry.captureException(err, { tags, extra: context?.extra });
}

/**
 * Report a warning (non-critical issue).
 */
export function reportWarning(error: unknown, context?: ReportContext): void {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown warning');

  appLogger.warn(`[Observability] ${message}`, {
    feature: context?.feature,
    action: context?.action,
    severity: context?.severity,
    route: context?.route,
    userRole: context?.userRole,
    ...context?.extra,
  });

  if (!isSentryActive()) return;

  const wTags: Record<string, string> = {
    ...(context?.feature ? { feature: context.feature } : {}),
    ...(context?.action ? { action: context.action } : {}),
    ...(context?.severity ? { severity: context.severity } : {}),
    ...(context?.route ? { route: context.route } : {}),
    ...(context?.userRole ? { user_role: context.userRole } : {}),
    ...context?.tags,
  };

  Sentry.captureMessage(message, {
    level: 'warning',
    tags: wTags,
    extra: context?.extra,
  });
}

/**
 * Report an informational message.
 */
export function reportMessage(message: string, context?: ReportContext): void {
  appLogger.info(`[Observability] ${message}`, {
    feature: context?.feature,
    action: context?.action,
    severity: context?.severity,
    route: context?.route,
    userRole: context?.userRole,
    ...context?.extra,
  });

  if (!isSentryActive()) return;

  const iTags: Record<string, string> = {
    ...(context?.feature ? { feature: context.feature } : {}),
    ...(context?.action ? { action: context.action } : {}),
    ...(context?.severity ? { severity: context.severity } : {}),
    ...(context?.route ? { route: context.route } : {}),
    ...(context?.userRole ? { user_role: context.userRole } : {}),
    ...context?.tags,
  };

  Sentry.captureMessage(message, {
    level: 'info',
    tags: iTags,
    extra: context?.extra,
  });
}
