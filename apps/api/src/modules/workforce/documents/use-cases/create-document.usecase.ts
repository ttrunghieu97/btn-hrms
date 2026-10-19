import { Injectable } from "@nestjs/common";
import { EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import { throwForbidden } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { CreateDocumentDto } from "../dto/documents.dto";
import type { DocumentListRow } from "../repositories/document-query.repository";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class CreateDocumentUseCase {
  constructor(
    private readonly repo: EmployeeDocumentRepository,
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(dto: CreateDocumentDto, scope?: DataScope): Promise<DocumentListRow> {
    if (scope?.tier === "self" && dto.employeeId !== scope.employeeId) {
      throwForbidden("Access denied to out-of-scope employee document", ERROR_CODES.PERMISSION_DENIED);
    }
    if (scope?.tier === "department") {
      if (!scope.departmentId) {
        throwForbidden("Access denied to out-of-scope department document", ERROR_CODES.PERMISSION_DENIED);
      }
      if (typeof this.queryRepo.findEmployeeDepartmentId === "function") {
        const empDeptId = await this.queryRepo.findEmployeeDepartmentId(dto.employeeId);
        if (empDeptId !== scope.departmentId) {
          throwForbidden("Access denied to out-of-scope department document", ERROR_CODES.PERMISSION_DENIED);
        }
      }
    }

    const row = await this.repo.insertEmployeeDocument(dto.employeeId, {
      documentType: dto.documentType,
      fileId: dto.fileId,
    });

    const result = await this.queryRepo.findById(row.id);
    if (!result) throw new Error("Failed to retrieve created document");
    if (
      scope?.tier === "department" &&
      (!scope.departmentId || result.departmentId !== scope.departmentId)
    ) {
      throwForbidden("Access denied to out-of-scope department document", ERROR_CODES.PERMISSION_DENIED);
    }
    return result;
  }
}
