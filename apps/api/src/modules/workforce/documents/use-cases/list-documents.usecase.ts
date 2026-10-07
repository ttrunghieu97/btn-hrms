import { Injectable } from "@nestjs/common";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import type { ListDocumentsQueryDto } from "../dto/documents.dto";
import type { PaginatedDocuments } from "../repositories/document-query.repository";

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(query: ListDocumentsQueryDto): Promise<PaginatedDocuments> {
    return this.queryRepo.findPaginated(query);
  }
}
