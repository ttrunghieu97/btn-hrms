import { type EmployeeContractResponseDto } from "../dto/employee-contract-response.dto";
import { type EmployeeWithRelations } from "../../employees/repositories/employees.repository";

export class EmployeeContractMapper {
  static toResponse(
    row: Pick<EmployeeWithRelations, "id" | "employmentRecords" | "contracts">,
  ): EmployeeContractResponseDto {
    const currentContract =
      row.contracts?.find((item) => item.isCurrent) ?? row.contracts?.[0];
    const currentEmployment =
      row.employmentRecords?.find((item) => item.isCurrent) ??
      row.employmentRecords?.[0];

    return {
      employeeId: row.id,
      startDate:
        currentEmployment?.startDate ?? currentContract?.effectiveFrom ?? null,
      endDate:
        currentEmployment?.endDate ?? currentContract?.effectiveTo ?? null,
      contractType: currentContract?.contractType ?? null,
      contractStatus: currentContract?.status ?? "active",
    };
  }
}

