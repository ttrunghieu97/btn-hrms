import { type Logger } from "@nestjs/common";
import type * as Sentry from "@sentry/node";

let sentryEnabled = false;
let sentryModule: typeof Sentry | null = null;

export async function initSentry(logger: Logger): Promise<void> {
  const dsn = process.env.OBSERVABILITY_SENTRY_DSN;
  if (!dsn) {
    logger.log("Sentry init skipped (OBSERVABILITY_SENTRY_DSN missing).");
    return;
  }

  // Dynamic import — cost only paid when Sentry DSN is configured
  sentryModule = await import("@sentry/node");

  const tracesSampleRate = Number(process.env.OBSERVABILITY_SENTRY_TRACES_SAMPLE_RATE || 0);

  sentryModule.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
  });

  sentryEnabled = true;
  logger.log("Sentry initialized.");
}

export function captureException(
  err: unknown,
  ctx?: { req?: any; user?: any },
): void {
  if (!sentryEnabled || !sentryModule) return;

  const Sentry = sentryModule;

  Sentry.withScope((scope) => {
    try {
      const { trace } = require("@opentelemetry/api");
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        scope.setTag("trace_id", spanContext.traceId);
        scope.setTag("span_id", spanContext.spanId);
      }
    } catch {
      // OTEL missing
    }

    if (ctx?.req) {
      scope.setExtra("request_url", ctx.req.originalUrl || ctx.req.url);
      scope.setExtra("request_method", ctx.req.method);
    }

    if (ctx?.user) {
      scope.setUser({ id: String(ctx.user.id) });
    }

    Sentry.captureException(err);
  });
}
