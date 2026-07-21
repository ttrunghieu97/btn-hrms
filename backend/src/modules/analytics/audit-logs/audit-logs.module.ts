import { Module } from "@nestjs/common";
import { AuditLogsRepository } from "./repositories/audit-logs.repository";
import { AuditLogsController } from "./audit-logs.controller";
import { CreateAuditLogUseCase } from "./use-cases/create-audit-log.usecase";
import { ListAuditLogsUseCase } from "./use-cases/list-audit-logs.usecase";

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsRepository, CreateAuditLogUseCase, ListAuditLogsUseCase],
  exports: [CreateAuditLogUseCase],
})
export class AuditLogsModule {}



