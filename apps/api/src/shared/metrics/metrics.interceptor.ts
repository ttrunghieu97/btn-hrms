import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          const method = req?.method ?? "UNKNOWN";
          const routePath = req?.route?.path
            ? `${req?.baseUrl || ""}${req.route.path}`
            : null;
          const path =
            (routePath || req?.originalUrl || req?.url || "").split("?")[0] ||
            "unknown";
          const statusCode = res?.statusCode ?? 0;
          this.metrics.observeHttp(method, path, statusCode, durationMs);
        },
        error: () => {
          const durationMs = Date.now() - start;
          const method = req?.method ?? "UNKNOWN";
          const routePath = req?.route?.path
            ? `${req?.baseUrl || ""}${req.route.path}`
            : null;
          const path =
            (routePath || req?.originalUrl || req?.url || "").split("?")[0] ||
            "unknown";
          const statusCode = res?.statusCode ?? 0;
          this.metrics.observeHttp(method, path, statusCode, durationMs);
        },
      }),
    );
  }
}
