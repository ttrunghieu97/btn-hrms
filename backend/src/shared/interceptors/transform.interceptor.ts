import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { SSE_METADATA } from "@nestjs/common/constants";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { RequestContextService } from "../context/request-context.service";
import { SKIP_TRANSFORM_KEY } from "../decorators/skip-transform.decorator";

export interface Response<T> {
  data: T;
  meta: Record<string, any>;
  error: null | object;
}

function extractPaginationMeta(res: Record<string, unknown>): Record<string, unknown> | null {
  if ("page" in res && "limit" in res) {
    return {
      page: res.page,
      limit: res.limit,
      total: res.total,
      hasNext: res.hasNext,
    };
  }
  return null;
}

function extractUserMeta(res: Record<string, unknown>): unknown {
  return "meta" in res ? res.meta : null;
}

function wrapResponse<T>(
  data: T,
  meta: Record<string, any>,
): Response<T> {
  return { data, meta, error: null };
}

function isAlreadyEnveloped(res: Record<string, unknown>): boolean {
  return "data" in res && "meta" in res;
}

function isFullPaginated(res: Record<string, unknown>): boolean {
  return "rows" in res && "total" in res && "page" in res && "limit" in res;
}

function isPaginatedWithTotal(res: Record<string, unknown>): boolean {
  return "data" in res && "total" in res;
}

function isPartialPaginated(res: Record<string, unknown>): boolean {
  return "rows" in res && "page" in res;
}

function isItemsWithSummary(res: Record<string, unknown>): boolean {
  return "items" in res && "summary" in res;
}

function isItemsOnly(res: Record<string, unknown>): boolean {
  return "items" in res;
}

function isAnalyticsDashboard(res: Record<string, unknown>): boolean {
  return "statusDistribution" in res && "priorityDistribution" in res;
}

function isStatusResponse(res: Record<string, unknown>): boolean {
  return ("ok" in res || "success" in res) &&
    Object.keys(res).every((key) => ["ok", "success", "revoked"].includes(key));
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<unknown>
> {
  constructor(private readonly requestContext: RequestContextService) {}

  private shouldSkipTransform(context: ExecutionContext): boolean {
    const isSseHandler =
      Reflect.getMetadata(SSE_METADATA, context.getHandler()) === true;
    const isSkipTransform =
      Reflect.getMetadata(SKIP_TRANSFORM_KEY, context.getHandler()) === true ||
      Reflect.getMetadata(SKIP_TRANSFORM_KEY, context.getClass()) === true;
    return isSkipTransform || isSseHandler;
  }

  private isStreamRoute(request: any): boolean {
    const accept = String(request?.headers?.accept ?? "");
    const url = String(request?.originalUrl || request?.url || "");
    return (
      accept.includes("text/event-stream") ||
      url.includes("/stream") ||
      String(request?.route?.path ?? "").includes("stream")
    );
  }

  private buildMeta(res: unknown, ctx: any, response: any, request: any): Record<string, any> {
    const durationMs = ctx?.startTime ? Date.now() - ctx.startTime : 0;
    response.setHeader("x-response-time", `${durationMs}ms`);
    const requestId =
      ctx?.requestId ||
      response.getHeader?.("x-request-id") ||
      request?.id ||
      request?.headers?.["x-request-id"];
    const timestamp = new Date().toISOString();

    const meta: Record<string, any> = {
      requestId: String(requestId || ""),
      timestamp,
    };

    if (res && typeof res === "object") {
      const userMeta = extractUserMeta(res as Record<string, unknown>);
      if (userMeta) {
        Object.assign(meta, userMeta);
      }
      const paginationMeta = extractPaginationMeta(res as Record<string, unknown>);
      if (paginationMeta) {
        Object.assign(meta, paginationMeta);
      }
    }

    return meta;
  }

  private wrapStreaming(res: unknown, response: any): unknown {
    if (
      res &&
      typeof res === "object" &&
      typeof (res as any).subscribe === "function"
    ) {
      return res;
    }
    if (response?.headersSent) {
      return res;
    }
    return null; // not streaming
  }

  private shapeResponse(res: unknown, meta: Record<string, any>): Response<unknown> {
    if (res === null || res === undefined) {
      return wrapResponse(res ?? null, meta);
    }
    if (typeof res !== "object") {
      return wrapResponse(res, meta);
    }

    const obj = res as Record<string, unknown>;

    // Already enveloped: { data, meta }
    if (isAlreadyEnveloped(obj)) {
      return wrapResponse(obj.data as T, meta);
    }

    // Full paginated: { rows, total, page, limit }
    if (isFullPaginated(obj)) {
      return wrapResponse(obj.rows as T, meta);
    }

    // Paginated with total: { data, total }
    if (isPaginatedWithTotal(obj)) {
      return wrapResponse(obj.data as T, meta);
    }

    // Partial paginated: { rows, page }
    if (isPartialPaginated(obj)) {
      return wrapResponse(obj.rows as T, meta);
    }

    // Items with summary: { items, summary }
    if (isItemsWithSummary(obj)) {
      return wrapResponse(obj.items as T, {
        ...meta,
        summary: (obj as any).summary,
      });
    }

    // Items only
    if (isItemsOnly(obj)) {
      return wrapResponse(obj.items as T, meta);
    }

    // Analytics dashboard: { statusDistribution, priorityDistribution }
    if (isAnalyticsDashboard(obj)) {
      return wrapResponse(
        {
          statusDistribution: obj.statusDistribution,
          priorityDistribution: obj.priorityDistribution,
        } as T,
        {
          ...meta,
          totalCount: obj.totalCount,
          completionRate: obj.completionRate,
          overdueCount: obj.overdueCount,
          slaBreachCount: obj.slaBreachCount,
        },
      );
    }

    // Generic { data } wrapper
    if ("data" in obj) {
      return wrapResponse(obj.data as T, meta);
    }

    // Generic { rows } wrapper
    if ("rows" in obj) {
      return wrapResponse(obj.rows as T, meta);
    }

    // Status response: { ok } or { success }
    if (isStatusResponse(obj)) {
      return wrapResponse(res as T, meta);
    }

    // Fallback: wrap entire response as data
    return wrapResponse(res as T, meta);
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T | unknown>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // If headers already sent (streaming), skip wrapping entirely.
    if (response?.headersSent) {
      return next.handle() as any;
    }

    // Skip wrapping for SSE, skip-transform decorator, or stream routes.
    if (this.shouldSkipTransform(context) || this.isStreamRoute(request)) {
      return next.handle() as any;
    }

    return next.handle().pipe(
      map((res) => {
        // Check if response is an Observable (SSE stream) — never wrap.
        const streaming = this.wrapStreaming(res, response);
        if (streaming !== null) return streaming as Response<unknown>;

        const ctx = this.requestContext.get();
        const meta = this.buildMeta(res, ctx, response, request);
        return this.shapeResponse(res, meta);
      }),
    );
  }
}
