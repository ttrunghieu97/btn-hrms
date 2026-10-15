import { Module } from "@nestjs/common";
import { LaborReportController } from "./labor-report.controller";
import { LaborReportService } from "./labor-report.service";
import { LaborReportDocxService } from "./labor-report-docx.service";
import { LaborReportRepository } from "./repositories/labor-report.repository";
import { ExportLaborReportExcelUseCase } from "./use-cases/export-labor-report-excel.usecase";
import { ExportLaborReportDocxUseCase } from "./use-cases/export-labor-report-docx.usecase";

@Module({
  controllers: [LaborReportController],
  providers: [
    LaborReportService,
    LaborReportDocxService,
    LaborReportRepository,
    ExportLaborReportExcelUseCase,
    ExportLaborReportDocxUseCase,
  ],
})
export class LaborReportModule {}
