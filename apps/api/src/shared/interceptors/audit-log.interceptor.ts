import {
  Inject,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, catchError, tap, throwError } from "rxjs";
import { CONTRACTS_TOKENS } from "../../contracts/contracts.tokens";
import { type AuditLogPort } from "../../contracts/ports/audit-log.port";
import { RequestContextService } from "../context/request-context.service";
import {
  AUDIT_LOG_KEY,
  AuditLogOptions,
} from "../decorators/audit-log.decorator";
import { ContextLogger } from "../logging/context-logger";
import {
  clampPayloadSize,
  DEFAULT_REDACT_KEYS,
  redactSensitive,
} from "../utils/redaction.util";

const FINANCIAL_AUDIT_ENTITIES = new Set([
  "payroll",
  "payslip",
  "salary_structure",
  "employee_allowance",
  "employee_social_insurance",
]);

const FINANCIAL_EXTRA_REDACT_KEYS = [
  ...DEFAULT_REDACT_KEYS,
  "components",
  "amount",
  "rate",
];

export function extractAuditEntityId(
  response: unknown,
  params?: Record<string, unknown>,
  body?: unknown,
): string | undefined {
  const resp = (response ?? {}) as Record<string, any>;
  const reqBody =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : undefined;
  const directCandidates: unknown[] = [
    resp?.id,
    resp?.data?.id,
    resp?.user?.id,
    resp?.allowanceId,
    resp?.enrollmentId,
    resp?.payslipId,
    resp?.payrollRunId,
    resp?.employeeId,
    params?.id,
    params?.allowanceId,
    params?.enrollmentId,
    params?.payslipId,
    params?.payrollRunId,
    params?.periodId,
    params?.requestId,
    params?.employeeId,
    params?.userId,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  if (params && typeof params === "object") {
    for (const [key, val] of Object.entries(params)) {
      if (
        /id$/i.test(key) &&
        typeof val === "string" &&
        val.trim().length > 0
      ) {
        return val;
      }
    }
  }
  if (reqBody) {
    const bodyCandidates: unknown[] = [
      reqBody.id,
      reqBody.allowanceId,
      reqBody.enrollmentId,
      reqBody.payslipId,
      reqBody.payrollRunId,
      reqBody.payrollPeriodId,
      reqBody.periodId,
      reqBody.employeeId,
      reqBody.userId,
    ];
    for (const candidate of bodyCandidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate;
      }
    }
  }
  return undefined;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger: ContextLogger;

  constructor(
    private reflector: Reflector,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private auditLog: AuditLogPort,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, AuditLogInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.getAllAndOverride<AuditLogOptions>(
      AUDIT_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const isFinancialAudit =
      FINANCIAL_AUDIT_ENTITIES.has(options.entity) ||
      /^(payroll|payslip|salary|employee_allowance|employee_social_insurance)_/i.test(
        options.action,
      );
    const redactKeys = isFinancialAudit
      ? FINANCIAL_EXTRA_REDACT_KEYS
      : DEFAULT_REDACT_KEYS;

    const writeAudit = async (response: unknown, error?: unknown) => {
      try {
        const entityId = extractAuditEntityId(
          response,
          request.params,
          request.body,
        );
        const redactedBody = redactSensitive(request.body, redactKeys);
        const redactedParams = redactSensitive(request.params, redactKeys);
        const redactedQuery = redactSensitive(request.query, redactKeys);
        const redactedResponse = redactSensitive(response, redactKeys);
        const rawErrorResponse = (error as any)?.response;
        const sanitizedErrorResponse =
          rawErrorResponse && typeof rawErrorResponse === "object"
            ? (() => {
                const { body: _b, target: _t, ...rest } = rawErrorResponse as Record<string, unknown>;
                return rest;
              })()
            : rawErrorResponse ?? null;
        const errorMeta = error
          ? {
              error: clampPayloadSize(
                redactSensitive(
                  {
                    message: (error as any)?.message || "unknown_error",
                    name: (error as any)?.name || "Error",
                    status: (error as any)?.status ?? null,
                    response: sanitizedErrorResponse,
                  },
                  redactKeys,
                ),
                10_000,
              ),
            }
          : {};

        await this.auditLog.write({
          actorUserId: user?.id,
          action: options.action,
          entity: options.entity,
          entityId,
          metadata: {
            body: clampPayloadSize(redactedBody, 10_000),
            params: clampPayloadSize(redactedParams, 5_000),
            query: clampPayloadSize(redactedQuery, 5_000),
            response: clampPayloadSize(redactedResponse, 10_000),
            success: !error,
            ...errorMeta,
          },
        });
      } catch (auditError) {
        this.logger.error({
          msg: "audit_log_write_failed",
          action: options.action,
          entity: options.entity,
          reason: (auditError as any)?.message || "unknown_error",
        });
      }
    };

    return next.handle().pipe(
      tap((response) => {
        void writeAudit(response);
      }),
      catchError((error) => {
        void writeAudit(null, error);
        return throwError(() => error);
      }),
    );
  }
}
