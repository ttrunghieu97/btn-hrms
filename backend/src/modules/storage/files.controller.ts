import {
  Controller,
  Get,
  Req,
  Res,
} from "@nestjs/common";
import { throwNotFound } from "../../shared/utils/http-error";
import { ERROR_CODES } from "../../shared/constants/error-codes";
import type { Request, Response } from "express";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { AuthenticatedOnlyPolicy } from "../../core/security/policies/authenticated-only.policy";
import { RequestContextService } from "../../shared/context/request-context.service";
import { ContextLogger } from "../../shared/logging/context-logger";
import type { AuthUser } from "../../core/security/types/auth-user.interface";
import { ServeFileUseCase } from "./use-cases/serve-file.usecase";

@ApiTags("Files")
@ApiBearerAuth()
@Controller("files")
export class FilesController {
  private readonly logger: ContextLogger;

  constructor(
    private readonly serveFileUseCase: ServeFileUseCase,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, FilesController.name);
  }

  @Get("*path")
  @CheckPolicy(AuthenticatedOnlyPolicy)
  @ApiOperation({ summary: "Serve a file by storage key" })
  @ApiParam({ name: "path", required: true, schema: { type: "string" } })
  async getFile(
    @Req() req: Request & { user?: AuthUser },
    @Res() res: Response,
  ) {
    const rawPathFromUrl = this.extractPathFromRequest(req);
    const rawPath =
      rawPathFromUrl ??
      (req.params?.path as string | undefined) ??
      (req.params?.["0"]) ??
      Object.values(req.params ?? {}).find(
        (value): value is string => typeof value === "string" && value.length > 0,
      ) ??
      "";
    const key = this.normalizeKey(rawPath);
    if (!key) {
      return res.status(404).end();
    }

    const user = req.user;
    if (!user) {
      throwNotFound("User not authenticated", ERROR_CODES.USER_NOT_AUTHENTICATED);
    }

    const result = await this.serveFileUseCase.execute(key, user);

    const ifNoneMatch = req.headers["if-none-match"];
    if (result.etag && ifNoneMatch && ifNoneMatch === result.etag) {
      return res.status(304).end();
    }

    if (result.etag) res.setHeader("ETag", result.etag);
    if (result.lastModified) {
      res.setHeader("Last-Modified", result.lastModified.toUTCString());
    }
    res.setHeader("Cache-Control", result.cacheControl);

    if (result.type === "redirect" && result.url) {
      return res.redirect(302, result.url);
    }

    if (result.type === "stream" && result.stream) {
      if (result.contentType) res.setHeader("Content-Type", result.contentType);
      if (result.sizeBytes) res.setHeader("Content-Length", String(result.sizeBytes));

      result.stream.on("error", (err: Error) => {
        this.logger.error({
          event: "file.serve.stream_error",
          key,
          error: err.message,
        });
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.destroy();
        }
      });

      res.on("close", () => {
        if (!res.writableEnded) {
          (result.stream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
        }
      });

      result.stream.pipe(res);
    }
  }

  private normalizeKey(rawPath?: string): string | null {
    const decoded = decodeURIComponent(String(rawPath ?? "")).trim();
    if (!decoded) return null;
    if (decoded.length > 512) return null;
    if (decoded.includes("\0")) return null;
    if (decoded.startsWith("/")) return null;
    if (decoded.includes("..")) return null;
    if (decoded.includes("\\")) return null;
    // Allow only safe path characters
    if (!/^[A-Za-z0-9._/-]+$/.test(decoded)) return null;
    // Allow only known prefixes
    if (!/^(employees|tasks|temp|archived|attendance)\/[A-Za-z0-9._/-]+$/.test(decoded)) return null;
    return decoded;
  }

  private extractPathFromRequest(req: Request): string | null {
    const candidates = [req.originalUrl, req.url, req.path].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

    for (const candidate of candidates) {
      const clean = candidate.split("?")[0] ?? "";
      const matched = clean.match(/\/api\/v1\/files\/(.+)$/) ?? clean.match(/\/files\/(.+)$/);
      if (matched?.[1]) {
        return matched[1];
      }
    }

    return null;
  }
}
