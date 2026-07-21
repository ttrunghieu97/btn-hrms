import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const headerValue = req.headers["x-request-id"];
    const headerId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const requestId = req.id || headerId || randomUUID();

    req.id = requestId;
    if (!res.headersSent && !res.getHeader("x-request-id")) {
      res.setHeader("x-request-id", requestId);
    }

    next();
  }
}
