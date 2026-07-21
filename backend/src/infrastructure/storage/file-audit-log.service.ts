import { Injectable, Inject } from "@nestjs/common";
import { CONTRACTS_TOKENS } from "../../contracts/contracts.tokens";
import type { AuditLogPort } from "../../contracts/ports/audit-log.port";
import { ContextLogger } from "../../shared/logging/context-logger";
import { RequestContextService } from "../../shared/context/request-context.service";

/**
 * File-specific audit log wrapper.
 *
 * Writes structured audit entries to the shared audit_logs table
 * for every significant file lifecycle event.
 */
@Injectable()
export class FileAuditLogService {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, FileAuditLogService.name);
  }

  async upload(fileId: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.write("file.upload", fileId, userId, metadata);
  }

  async finalize(fileId: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.write("file.finalize", fileId, userId, metadata);
  }

  async serve(fileId: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.write("file.serve", fileId, userId, metadata);
  }

  async delete(fileId: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.write("file.delete", fileId, userId, metadata);
  }

  async restore(fileId: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.write("file.restore", fileId, userId, metadata);
  }

  async confirm(fileId: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.write("file.confirm", fileId, userId, metadata);
  }

  async bind(fileId: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.write("file.bind", fileId, userId, metadata);
  }

  async unbind(fileId: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.write("file.unbind", fileId, userId, metadata);
  }

  async retentionExpire(
    fileId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // System action — no actor user
    await this.write("file.retention_expire", fileId, undefined, metadata);
  }

  private async write(
    action: string,
    entityId: string,
    actorUserId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditLog.write({
        actorUserId: actorUserId ?? undefined,
        action,
        entity: "file",
        entityId,
        metadata,
      });
    } catch (err: unknown) {
      // Never fail the calling operation — audit is best-effort
      this.logger.warn({
        event: "file_audit.write_fail",
        action,
        fileId: entityId,
        error: (err as Error).message,
      });
    }
  }
}
