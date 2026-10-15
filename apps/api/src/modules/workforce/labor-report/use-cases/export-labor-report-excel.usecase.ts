import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { LaborReportService } from "../labor-report.service";

@Injectable()
export class ExportLaborReportExcelUseCase {
  constructor(private readonly reportService: LaborReportService) {}

  async execute(year: number): Promise<{ buffer: Buffer; filename: string }> {
    const buffer = await this.reportService.generateReport(year);
    const filename = `BÁO CÁO TÌNH HÌNH SD LAO ĐỘNG ${year}.xlsx`;
    const dir = "storage/reports";
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), buffer);
    return { buffer, filename };
  }
}
