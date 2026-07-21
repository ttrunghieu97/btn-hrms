import { Injectable } from "@nestjs/common";
import { throwBadRequest } from "../utils/http-error";
import { ERROR_CODES } from "../constants/error-codes";
import { AsyncLocalStorage } from "node:async_hooks";
import { getScopeId } from "../constants/system";

export type RequestContext = {
  requestId: string;
  traceId?: string;
  correlationId?: string;
  causationId?: string;
  userId?: string | null;
  username?: string | null;
  employeeId?: string | null;
  scopeId?: string | null;
  departmentId?: string | null;
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
  ip?: string | null;
  userAgent?: string | null;
  startTime: number;
  method?: string;
  path?: string;
  dbExecutor?: unknown;
};

@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, fn: () => T): T {
    return this.als.run(context, fn);
  }

  get(): RequestContext | undefined {
    return this.als.getStore();
  }

  getTraceId(): string {
    return this.get()?.traceId ?? this.get()?.requestId ?? "unknown";
  }

  merge(partial: Partial<RequestContext>): RequestContext {
    const current = this.get();
    return {
      ...(current ?? {}),
      ...partial,
      requestId: partial.requestId ?? current?.requestId ?? "unknown",
      startTime: partial.startTime ?? current?.startTime ?? Date.now(),
    };
  }

  resolveScopeId(explicitScopeId?: string | null): string | null {
    const ctx = this.get();
    const contextScopeId = ctx?.scopeId ?? null;
    const fallbackScopeId = getScopeId();

    if (explicitScopeId && contextScopeId && explicitScopeId !== contextScopeId) {
      throwBadRequest("Scope context mismatch", ERROR_CODES.INVALID_REQUEST);
    }

    return explicitScopeId ?? contextScopeId ?? fallbackScopeId;
  }

  getScopeId(explicitScopeId?: string | null): string | null {
    return this.resolveScopeId(explicitScopeId);
  }

  getScopeIdOrThrow(explicitScopeId?: string | null): string {
    const scopeId = this.resolveScopeId(explicitScopeId);
    if (!scopeId) {
      throwBadRequest("Scope context is required", ERROR_CODES.INVALID_REQUEST);
    }
    return scopeId;
  }

  /** @deprecated Use getScopeIdOrThrow */
  getTenantIdOrThrow(explicitTenantId?: string | null): string {
    return this.getScopeIdOrThrow(explicitTenantId);
  }
}
