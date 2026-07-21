import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { RequestContextService } from "../context/request-context.service";
import { trace } from "@opentelemetry/api";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { id?: string; user?: { id?: string } }>();
    const res = http.getResponse<Response>();

    const ctx = this.requestContext.get();
    const startedAt = ctx?.startTime ?? Date.now();
    const requestId =
      ctx?.requestId ?? req?.id ?? req?.headers?.["x-request-id"];

    const method = ctx?.method ?? req?.method;
    const url = ctx?.path ?? req?.originalUrl ?? req?.url;
    const userId = ctx?.userId
      ? String(ctx.userId)
      : req?.user?.id
        ? String(req.user.id)
        : "anonymous";
    const ip = ctx?.ip ?? req?.ip;
    const userAgent = ctx?.userAgent ?? req?.headers?.["user-agent"];

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startedAt;
          const statusCode = res?.statusCode;
          const activeSpan = trace.getActiveSpan();
          const spanContext = activeSpan?.spanContext();

          this.logger.log(
            JSON.stringify({
              level: "info",
              msg: "http_request",
              method,
              path: url,
              statusCode,
              durationMs: ms,
              requestId,
              userId,
              ip,
              userAgent,
              trace_id: spanContext?.traceId,
              span_id: spanContext?.spanId,
            }),
          );
        },
        error: () => {
          const ms = Date.now() - startedAt;
          const statusCode = res?.statusCode;
          const activeSpan = trace.getActiveSpan();
          const spanContext = activeSpan?.spanContext();
          const isErrorStatus = !statusCode || statusCode >= 400;
          const payload = JSON.stringify({
            level: isErrorStatus ? "warn" : "info",
            msg: isErrorStatus ? "http_request_error" : "http_request",
            method,
            path: url,
            statusCode,
            durationMs: ms,
            requestId,
            userId,
            ip,
            userAgent,
            trace_id: spanContext?.traceId,
            span_id: spanContext?.spanId,
          });

          if (isErrorStatus) this.logger.warn(payload);
          else this.logger.log(payload);
        },
      }),
    );
  }
}
