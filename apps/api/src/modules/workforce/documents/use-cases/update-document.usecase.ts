import { Injectable } from "@nestjs/common";
import { EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import { throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { UpdateDocumentDto } from "../dto/documents.dto";
import type { DocumentListRow } from "../repositories/document-query.repository";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class UpdateDocumentUseCase {
  constructor(
    private readonly repo: EmployeeDocumentRepository,
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(id: string, dto: UpdateDocumentDto, scope?: DataScope): Promise<DocumentListRow> {
    const existing = await this.queryRepo.findById(id);
    if (!existing) {
      throwNotFound("Document not found", ERROR_CODES.DOCUMENT_NOT_FOUND, { id });
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

    if (dto.documentType !== undefined || dto.fileId !== undefined) {
      await this.repo.updateDocumentById(id, {
        documentType: dto.documentType,
        fileId: dto.fileId,
      });
    }

    const result = await this.queryRepo.findById(id);
    if (!result) throw new Error("Failed to retrieve updated document");
    return result;
  }
}
