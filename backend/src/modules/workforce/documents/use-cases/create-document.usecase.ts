import { Injectable } from "@nestjs/common";
import { EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import type { CreateDocumentDto } from "../dto/documents.dto";
import type { DocumentListRow } from "../repositories/document-query.repository";

@Injectable()
export class CreateDocumentUseCase {
  constructor(
    private readonly repo: EmployeeDocumentRepository,
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(dto: CreateDocumentDto): Promise<DocumentListRow> {
    const row = await this.repo.insertEmployeeDocument(dto.employeeId, {
      documentType: dto.documentType,
      fileId: dto.fileId,
    });

    const result = await this.queryRepo.findById(row.id);
    if (!result) throw new Error("Failed to retrieve created document");
    return result;
  }
}
