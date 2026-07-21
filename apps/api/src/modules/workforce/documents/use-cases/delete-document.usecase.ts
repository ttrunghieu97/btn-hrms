import { Injectable } from "@nestjs/common";
import { EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class DeleteDocumentUseCase {
  constructor(
    private readonly repo: EmployeeDocumentRepository,
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(documentId: string): Promise<void> {
    const existing = await this.queryRepo.findById(documentId);
    if (!existing) {
      throwNotFound("Document not found", ERROR_CODES.DOCUMENT_NOT_FOUND, { id: documentId });
    }

    await this.repo.deleteEmployeeDocumentById(existing.employeeId, documentId);
  }
}
