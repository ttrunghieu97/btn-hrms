import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { RequestContextService } from "./request-context.service";

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  correlationId: string | null;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  error?: string | null;
}

@Injectable()
export class TracingService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  /** Get current span from context, or create anonymous root span */
  current(): TraceSpan {
    const ctx = this.requestContext.get();
    return {
      traceId: ctx?.traceId ?? randomUUID(),
      spanId: randomUUID(),
      parentSpanId: null,
      correlationId: ctx?.correlationId ?? null,
      name: "unknown",
      startTime: Date.now(),
    };
  }

  /** Create a named child span linked to current context */
  childSpan(name: string, correlationId?: string): TraceSpan {
    const parent = this.current();
    return {
      traceId: parent.traceId,
      spanId: randomUUID(),
      parentSpanId: parent.spanId,
      correlationId: correlationId ?? parent.correlationId,
      name: TracingService.normalizeSpanName(name),
      startTime: Date.now(),
    };
  }

  /** Run fn within a named span, auto-recording timing + exporting to trace_logs.
   *  Returns the fn result + the completed span. */
  async runWithSpan<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<{ result: T; span: TraceSpan }> {
    const span = this.childSpan(name);
    const ctx = this.requestContext.get();

    return this.requestContext.run(
      {
        ...ctx,
        requestId: ctx?.requestId ?? span.traceId,
        traceId: span.traceId,
        correlationId: span.correlationId ?? ctx?.correlationId,
      } as any,
      async () => {
        try {
          const result = await fn();
          span.endTime = Date.now();
          span.durationMs = span.endTime - span.startTime;
          return { result, span };
        } catch (error) {
          span.endTime = Date.now();
          span.durationMs = span.endTime - span.startTime;
          span.error = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
    );
  }

  /** Extract trace metadata from event payload __trace field */
  extractFromPayload(payload: unknown): {
    traceId?: string;
    spanId?: string;
    correlationId?: string;
  } | null {
    if (!payload || typeof payload !== "object") return null;
    const trace = (payload as Record<string, unknown>).__trace as
      | Record<string, unknown>
      | undefined;
    if (!trace || typeof trace !== "object") return null;
    return {
      traceId: String(trace.traceId ?? ""),
      spanId: String(trace.spanId ?? ""),
      correlationId: String(trace.correlationId ?? ""),
    };
  }

  /** Normalize span names to {module}.{component}.{action} convention */
  static normalizeSpanName(raw: string): string {
    return raw
      .trim()
      .replace(/\s+/g, ".")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();
  }
}
