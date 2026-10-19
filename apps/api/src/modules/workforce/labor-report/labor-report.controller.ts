import { Controller, Get, Header, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { LaborReportQueryDto } from "./dto/labor-report-query.dto";
import { ExportLaborReportExcelUseCase } from "./use-cases/export-labor-report-excel.usecase";
import { ExportLaborReportDocxUseCase } from "./use-cases/export-labor-report-docx.usecase";
import type { Response } from "express";

@ApiTags("Labor Reports")
@ApiBearerAuth()
@Controller("reports/labor-usage")
export class LaborReportController {
  constructor(
    private readonly exportExcelUseCase: ExportLaborReportExcelUseCase,
    private readonly exportDocxUseCase: ExportLaborReportDocxUseCase,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.viewAll)
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @ApiOperation({ summary: "Export Mẫu 01/PLI - Excel (.xlsx)" })
  async export(@Query() query: LaborReportQueryDto, @Res() res: Response) {
    const year = query.year ?? new Date().getFullYear();
    const { buffer, filename } = await this.exportExcelUseCase.execute(year);

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }

  @Get("docx")
  @CheckPolicy(EmployeePolicies.viewAll)
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  @ApiOperation({ summary: "Export Mẫu 01/PLI - Word (.docx)" })
  async exportDocx(@Query() query: LaborReportQueryDto, @Res() res: Response) {
    const year = query.year ?? new Date().getFullYear();
    const { buffer, filename } = await this.exportDocxUseCase.execute(year);

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }
}
