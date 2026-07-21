import { Logger } from "@nestjs/common";
import { type RequestContextService } from "../context/request-context.service";
import { trace } from "@opentelemetry/api";

export class ContextLogger {
  private readonly logger: Logger;

  constructor(
    private readonly requestContext: RequestContextService,
    context?: string,
  ) {
    this.logger = new Logger(context ?? ContextLogger.name);
  }

  log(message: any, ...optionalParams: any[]) {
    this.logger.log(this.asJson("info", message), ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(this.asJson("warn", message), ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error(this.asJson("error", message), ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.logger.debug(this.asJson("debug", message), ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.logger.verbose(this.asJson("verbose", message), ...optionalParams);
  }

  private asJson(level: string, message: any) {
    const ctx = this.requestContext.get();
    const rid = ctx?.requestId;
    const uid = ctx?.userId ?? "anonymous";
    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan?.spanContext();

    const payload =
      message && typeof message === "object"
        ? { ...message }
        : { msg: String(message) };
    return JSON.stringify({
      level,
      ...payload,
      requestId: rid,
      userId: uid,
      trace_id: spanContext?.traceId,
      span_id: spanContext?.spanId,
    });
  }
}
