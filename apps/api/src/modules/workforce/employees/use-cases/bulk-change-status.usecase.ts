import { Injectable } from "@nestjs/common";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { ChangeEmployeeStatusDto } from "../dto/change-employee-status.dto";
import { BulkStatusDto } from "../dto/bulk-status.dto";
import { BulkResponseDto, BulkResultItem } from "../dto/bulk-response.dto";

@Injectable()
export class BulkChangeStatusUseCase {
  constructor(private readonly lifecycle: EmployeeLifecycleService) {}

  async execute(dto: BulkStatusDto): Promise<BulkResponseDto> {
    const results: BulkResultItem[] = [];

    for (const employeeId of dto.employeeIds) {
      try {
        const statusDto = new ChangeEmployeeStatusDto();
        statusDto.status = dto.status;
        statusDto.reason = dto.reason;
        statusDto.effectiveDate = dto.effectiveDate;
        await this.lifecycle.changeStatus(employeeId, statusDto);
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
