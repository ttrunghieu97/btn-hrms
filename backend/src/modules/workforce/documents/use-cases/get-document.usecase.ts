import { Injectable } from "@nestjs/common";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { DocumentListRow } from "../repositories/document-query.repository";

@Injectable()
export class GetDocumentUseCase {
  constructor(
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(id: string): Promise<DocumentListRow> {
    const doc = await this.queryRepo.findById(id);
    if (!doc) {
      throwNotFound("Document not found", ERROR_CODES.DOCUMENT_NOT_FOUND, { id });
    }
    return doc;
  }
}
