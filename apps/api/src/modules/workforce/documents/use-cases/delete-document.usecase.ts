import { Injectable } from "@nestjs/common";
import { EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import { throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class DeleteDocumentUseCase {
  constructor(
    private readonly repo: EmployeeDocumentRepository,
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(documentId: string, scope?: DataScope): Promise<void> {
    const existing = await this.queryRepo.findById(documentId);
    if (!existing) {
      throwNotFound("Document not found", ERROR_CODES.DOCUMENT_NOT_FOUND, { id: documentId });
    }
    if (scope?.tier === "self" && existing.employeeId !== scope.employeeId) {
      throwForbidden("Access denied to out-of-scope employee document", ERROR_CODES.PERMISSION_DENIED);
    }
    if (
      scope?.tier === "department" &&
      (!scope.departmentId || existing.departmentId !== scope.departmentId)
    ) {
      throwForbidden("Access denied to out-of-scope department document", ERROR_CODES.PERMISSION_DENIED);
    }

    await this.repo.deleteEmployeeDocumentById(existing.employeeId, documentId);
  }
}
