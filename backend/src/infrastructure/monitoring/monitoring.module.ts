import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { SystemHealthModule } from "./system-health/system-health.module";
import { ActivityMonitorModule } from "./activity-monitor/activity-monitor.module";
import { DataIntegrityModule } from "./data-integrity/data-integrity.module";

@Module({
  imports: [
    SystemHealthModule,
    ActivityMonitorModule,
    DataIntegrityModule,
    RouterModule.register([
      { path: "system-health", module: SystemHealthModule },
      { path: "activities", module: ActivityMonitorModule },
      { path: "data-integrity", module: DataIntegrityModule },
    ]),
  ],
})
export class MonitoringDomainModule {}
