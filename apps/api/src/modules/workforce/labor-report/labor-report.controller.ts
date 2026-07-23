import { Controller, Get, Header, Param, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { LaborReportService } from "./labor-report.service";
import { LaborReportDocxService } from "./labor-report-docx.service";
import { LaborReportQueryDto } from "./dto/labor-report-query.dto";
import type { Response } from "express";
import * as fs from "fs";

@ApiTags("Labor Reports")
@ApiBearerAuth()
@Controller("reports/labor-usage")
export class LaborReportController {
  constructor(
    private readonly reportService: LaborReportService,
    private readonly reportDocxService: LaborReportDocxService,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @ApiOperation({ summary: "Export Mẫu 01/PLI - Excel (.xlsx)" })
  async export(@Query() query: LaborReportQueryDto, @Res() res: Response) {
    const year = query.year ?? new Date().getFullYear();
    const buffer = await this.reportService.generateReport(year);

    const filename = `BÁO CÁO TÌNH HÌNH SD LAO ĐỘNG ${year}.xlsx`;
    const filepath = `storage/reports/${filename}`;
    await fs.promises.writeFile(filepath, buffer);

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }

  @Get("docx")
  @CheckPolicy(EmployeePolicies.view)
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  @ApiOperation({ summary: "Export Mẫu 01/PLI - Word (.docx)" })
  async exportDocx(@Query() query: LaborReportQueryDto, @Res() res: Response) {
    const year = query.year ?? new Date().getFullYear();
    const buffer = await this.reportDocxService.generateReport(year);

    const filename = `BÁO CÁO TÌNH HÌNH SD LAO ĐỘNG ${year}.docx`;
    const filepath = `storage/reports/${filename}`;
    await fs.promises.writeFile(filepath, buffer);

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }
}
