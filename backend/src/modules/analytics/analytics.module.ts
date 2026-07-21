import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";

@Module({
  imports: [
    DashboardModule,
    AuditLogsModule,
    RouterModule.register([
      { path: "dashboard", module: DashboardModule },
      { path: "audit-logs", module: AuditLogsModule },
    ]),
  ],
  exports: [AuditLogsModule],
})
export class AnalyticsDomainModule {}



