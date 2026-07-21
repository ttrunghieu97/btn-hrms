import { Injectable, type NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { RequestContextService } from "./request-context.service";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const context = this.requestContext.merge({
      requestId:
        (req as any).id ?? req.headers["x-request-id"]?.toString() ?? randomUUID(),
      startTime: Date.now(),
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    this.requestContext.run(context, () => next());
  }
}
