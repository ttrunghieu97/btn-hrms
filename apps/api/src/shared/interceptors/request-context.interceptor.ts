import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { randomUUID } from "crypto";
import { RequestContextService } from "../context/request-context.service";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const requestId = req.id || req.headers["x-request-id"] || randomUUID();
    req.id = requestId;

    if (!res.headersSent && !res.getHeader("x-request-id")) {
      res.setHeader("x-request-id", requestId);
    }

    const baseContext = this.requestContext.merge({
      requestId,
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      startTime: this.requestContext.get()?.startTime ?? Date.now(),
      method: req.method,
      path: req.originalUrl || req.url,
    });

    return this.requestContext.run(baseContext, () => {
      const user = req.user;
      const authenticatedContext = this.requestContext.merge({
        userId: user?.id ?? user?.sub ?? null,
        username: user?.username ?? null,
        employeeId: user?.employeeId ?? null,
        scopeId: user?.scopeId ?? null,
        departmentId: user?.departmentId ?? null,
        isSuperAdmin: user?.isSuperAdmin ?? false,
        permissions: user?.permissions ?? undefined,
        roles: user?.roles ?? undefined,
      });

      return this.requestContext.run(authenticatedContext, () => next.handle());
    });
  }
}
