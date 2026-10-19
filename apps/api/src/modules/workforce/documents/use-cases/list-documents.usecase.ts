import { Injectable } from "@nestjs/common";
import { DocumentQueryRepository } from "../repositories/document-query.repository";
import type { ListDocumentsQueryDto } from "../dto/documents.dto";
import type { PaginatedDocuments } from "../repositories/document-query.repository";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    private readonly queryRepo: DocumentQueryRepository,
  ) {}

  async execute(query: ListDocumentsQueryDto, scope?: DataScope): Promise<PaginatedDocuments> {
    return this.queryRepo.findPaginated(query, scope);
  }
}

