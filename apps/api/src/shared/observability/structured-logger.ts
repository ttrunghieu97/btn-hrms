import { Logger } from "@nestjs/common";
import { type RequestContextService } from "../context/request-context.service";
import { redactSensitive } from "../utils/redaction.util";

export type LogEvent = {
  event: string;
  module?: string;
  stage?: string;
  employeeId?: string;
  workflowInstanceId?: string;
  durationMs?: number;
  processedCount?: number;
  failedCount?: number;
  eventType?: string;
  attempt?: number;
  [key: string]: unknown;
};

export class StructuredLogger {
  private readonly logger: Logger;

  constructor(
    private readonly context: string,
    private readonly ctxService?: RequestContextService,
  ) {
    this.logger = new Logger(context);
  }

  private base(): Record<string, unknown> {
    const ctx = this.ctxService?.get();
    return {
      timestamp: new Date().toISOString(),
      traceId: ctx?.traceId ?? ctx?.requestId ?? "unknown",
      correlationId: ctx?.correlationId ?? null,
      causationId: ctx?.causationId ?? null,
    };
  }

  info(event: LogEvent): void {
    const redacted = (redactSensitive(event) || {}) as Record<string, unknown>;
    this.logger.log({ ...this.base(), level: "info", ...redacted });
  }

  warn(event: LogEvent): void {
    const redacted = (redactSensitive(event) || {}) as Record<string, unknown>;
    this.logger.warn({ ...this.base(), level: "warn", ...redacted });
  }

  error(event: LogEvent & { error: string }): void {
    const redacted = (redactSensitive(event) || {}) as Record<string, unknown>;
    this.logger.error({ ...this.base(), level: "error", ...redacted });
  }

  start(opts: { event: string; employeeId?: string; module?: string; stage?: string }): () => void {
    const startTime = Date.now();
    this.info({ ...opts, durationMs: 0 });
    return () => {
      const elapsed = Date.now() - startTime;
      this.info({ ...opts, durationMs: elapsed });
    };
  }
}
