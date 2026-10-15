import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { LaborReportDocxService } from "../labor-report-docx.service";

@Injectable()
export class ExportLaborReportDocxUseCase {
  constructor(private readonly reportDocxService: LaborReportDocxService) {}

  async execute(year: number): Promise<{ buffer: Buffer; filename: string }> {
    const buffer = await this.reportDocxService.generateReport(year);
    const filename = `BÁO CÁO TÌNH HÌNH SD LAO ĐỘNG ${year}.docx`;
    const dir = "storage/reports";
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), buffer);
    return { buffer, filename };
  }
}
