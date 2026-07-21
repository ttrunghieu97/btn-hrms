import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, defer, from, of, throwError } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";
import { IDEMPOTENCY_KEY, IdempotencyMetadata } from "./idempotency.decorator";
import { type IdempotencyBeginResult, IdempotencyService } from "./idempotency.service";

type IdempotencyHttpRequest = {
  headers?: Record<string, string | string[] | undefined>;
  params?: unknown;
  query?: unknown;
  body?: unknown;
  user?: { id?: unknown };
};

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotency: IdempotencyService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<IdempotencyMetadata>(IDEMPOTENCY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<IdempotencyHttpRequest>();
    const idempotencyKey = this.readIdempotencyKey(request);
    const actorUserId = typeof request.user?.id === "string" ? request.user.id : null;

    return defer(() =>
      from(
        this.idempotency.beginRequest({
          key: idempotencyKey,
          actorUserId,
          endpoint: metadata.endpoint,
          payload: {
            params: request.params ?? {},
            query: request.query ?? {},
            body: request.body ?? {},
            actorUserId,
          },
        }),
      ).pipe(mergeMap((begin) => this.handleRequest(begin, next))),
    );
  }

  private handleRequest(begin: IdempotencyBeginResult, next: CallHandler): Observable<unknown> {
    if (begin.mode === "disabled") {
      return next.handle();
    }

    if (begin.mode === "replay") {
      return of(this.idempotency.replay(begin.responsePayload));
    }

    return next.handle().pipe(
      mergeMap((response) =>
        from(this.idempotency.completeRequest(begin.recordId, response)).pipe(
          mergeMap(() => of(response)),
        ),
      ),
      catchError((error) =>
        from(this.idempotency.failRequest(begin.recordId, error)).pipe(
          mergeMap(() => throwError(() => error)),
        ),
      ),
    );
  }

  private readIdempotencyKey(request: IdempotencyHttpRequest): string | undefined {
    const header = request.headers?.["idempotency-key"];
    if (Array.isArray(header)) {
      return header[0];
    }
    return typeof header === "string" ? header : undefined;
  }
}
