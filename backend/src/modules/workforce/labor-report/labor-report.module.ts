import { Module } from "@nestjs/common";
import { LaborReportController } from "./labor-report.controller";
import { LaborReportService } from "./labor-report.service";
import { LaborReportDocxService } from "./labor-report-docx.service";
import { LaborReportRepository } from "./repositories/labor-report.repository";

@Module({
  controllers: [LaborReportController],
  providers: [LaborReportService, LaborReportDocxService, LaborReportRepository],
})
export class LaborReportModule {}
