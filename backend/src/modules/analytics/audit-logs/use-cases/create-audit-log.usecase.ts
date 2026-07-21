import { Injectable } from "@nestjs/common";
import { AuditLogEntry } from "../../../../contracts/ports/audit-log.port";
import { AuditLogsRepository } from "../repositories/audit-logs.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateAuditLogUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly auditLogsRepo: AuditLogsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateAuditLogUseCase.name);
  }

  async execute(entry: AuditLogEntry) {
    return this.auditLogsRepo.create({
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      result: entry.result ?? null,
      reason: entry.reason ?? null,
      traceId: entry.traceId ?? null,
      metadata: entry.metadata ?? null,
    });
  }
}
