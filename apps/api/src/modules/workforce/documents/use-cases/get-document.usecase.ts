import { Injectable } from "@nestjs/common";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import { throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { DocumentListRow } from "../repositories/document-query.repository";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class GetDocumentUseCase {
  constructor(
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(id: string, scope?: DataScope): Promise<DocumentListRow> {
    const doc = await this.queryRepo.findById(id);
    if (!doc) {
      throwNotFound("Document not found", ERROR_CODES.DOCUMENT_NOT_FOUND, { id });
    }
    if (scope?.tier === "self" && doc.employeeId !== scope.employeeId) {
      throwForbidden("Access denied to out-of-scope employee document", ERROR_CODES.PERMISSION_DENIED);
    }
    if (
      scope?.tier === "department" &&
      (!scope.departmentId || doc.departmentId !== scope.departmentId)
    ) {
      throwForbidden("Access denied to out-of-scope department document", ERROR_CODES.PERMISSION_DENIED);
    }
    return doc;
  }
}

