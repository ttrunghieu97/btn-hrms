import { type EmployeeDocumentResponseDto } from "../dto/employee-document-response.dto";
import { type CreateEmployeeDocumentDto } from "../dto/create-employee-document.dto";
import { type EmployeeDocumentRow } from "../../employees/repositories/employee-document.repository";

export class EmployeeDocumentMapper {
  static toResponse(row: EmployeeDocumentRow): EmployeeDocumentResponseDto {
    return {
      id: row.id,
      employeeId: row.employeeId,
      documentType: row.documentType,
      fileId: row.fileId,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }

  static toResponses(rows: EmployeeDocumentRow[]): EmployeeDocumentResponseDto[] {
    return rows.map((row) => this.toResponse(row));
  }

  static toEntity(dto: CreateEmployeeDocumentDto) {
    return {
      documentType: dto.documentType,
      fileId: dto.fileId,
    };
  }
}

