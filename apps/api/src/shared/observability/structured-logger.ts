import { Logger } from "@nestjs/common";
import { type RequestContextService } from "../context/request-context.service";

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
    this.logger.log({ ...this.base(), level: "info", ...event });
  }

  warn(event: LogEvent): void {
    this.logger.warn({ ...this.base(), level: "warn", ...event });
  }

  error(event: LogEvent & { error: string }): void {
    this.logger.error({ ...this.base(), level: "error", ...event });
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
