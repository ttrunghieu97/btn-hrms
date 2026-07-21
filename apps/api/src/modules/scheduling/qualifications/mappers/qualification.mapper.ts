import { type EmployeeQualificationWithNames } from "../repositories/employee-qualifications.repository.contract";
import { type QualificationResponseDto } from "../dto/qualification-response.dto";

export function mapQualificationToDto(
  record: EmployeeQualificationWithNames
): QualificationResponseDto {
  return {
    employeeId: record.employeeId,
    positionId: record.positionId,
    positionName: record.position?.name ?? "",
    createdAt: record.createdAt?.toISOString?.() ?? String(record.createdAt),
  };
}
