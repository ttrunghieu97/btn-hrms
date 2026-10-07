import { Injectable } from "@nestjs/common";
import { DeleteEmployeeUseCase } from "./delete-employee.usecase";
import { BulkArchiveDto } from "../dto/bulk-archive.dto";
import { BulkResponseDto, BulkResultItem } from "../dto/bulk-response.dto";

@Injectable()
export class BulkArchiveUseCase {
  constructor(
    private readonly deleteEmployee: DeleteEmployeeUseCase,
  ) {}

  async execute(dto: BulkArchiveDto): Promise<BulkResponseDto> {
    const results: BulkResultItem[] = [];

    for (const employeeId of dto.employeeIds) {
      try {
        await this.deleteEmployee.execute(employeeId);
        results.push({ employeeId, success: true });
      } catch (err: any) {
        results.push({ employeeId, success: false, error: err.message ?? "Unknown error" });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    return {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }
}
