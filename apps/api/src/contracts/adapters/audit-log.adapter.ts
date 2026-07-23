import { Injectable } from "@nestjs/common";
import { type AuditLogPort, type AuditLogEntry } from "../ports/audit-log.port";
import { CreateAuditLogUseCase } from "../../modules/analytics/audit-logs/use-cases/create-audit-log.usecase";

@Injectable()
export class AuditLogAdapter implements AuditLogPort {
  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async write(entry: AuditLogEntry): Promise<void> {
    await this.createAuditLog.execute(entry);
  }
}
