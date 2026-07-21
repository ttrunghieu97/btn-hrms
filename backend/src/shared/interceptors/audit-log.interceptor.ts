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
import { clampPayloadSize, redactSensitive } from "../utils/redaction.util";

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

    const writeAudit = async (response: unknown, error?: unknown) => {
      try {
        const entityId =
          (response as any)?.id ||
          (response as any)?.user?.id ||
          request.params?.id ||
          null;
        const redactedBody = redactSensitive(request.body);
        const redactedParams = redactSensitive(request.params);
        const redactedQuery = redactSensitive(request.query);
        const redactedResponse = redactSensitive(response);
        const errorMeta = error
          ? {
              error: clampPayloadSize(
                redactSensitive({
                  message: (error as any)?.message || "unknown_error",
                  name: (error as any)?.name || "Error",
                  status: (error as any)?.status ?? null,
                  response: (error as any)?.response ?? null,
                }),
                10_000,
              ),
            }
          : {};

        await this.auditLog.write({
          actorUserId: user?.id,
          action: options.action,
          entity: options.entity,
          entityId: typeof entityId === "string" ? entityId : undefined,
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
