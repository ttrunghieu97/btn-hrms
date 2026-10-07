import { Inject, Injectable } from "@nestjs/common";
import { AuditLogEntry, AuditLogPort } from "../../contracts/ports/audit-log.port";
import { DATABASE_CONNECTION } from "../database/database.provider";
import { AppDatabase } from "../database/database-client.type";
import { auditLogs } from "../database/schema";

@Injectable()
export class AuditLogAdapter implements AuditLogPort {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async write(entry: AuditLogEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
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
