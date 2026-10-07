import { Module } from "@nestjs/common";
import { EmployeeDocumentsModule } from "../employee-documents/employee-documents.module";
import { EmployeeDocumentRepository } from "../employees/repositories/employee-document.repository";
import { DocumentsController } from "./documents.controller";
import { DocumentQueryRepository } from "./repositories/document-query.repository";
import { ListDocumentsUseCase } from "./use-cases/list-documents.usecase";
import { GetDocumentUseCase } from "./use-cases/get-document.usecase";
import { CreateDocumentUseCase } from "./use-cases/create-document.usecase";
import { UpdateDocumentUseCase } from "./use-cases/update-document.usecase";
import { DeleteDocumentUseCase } from "./use-cases/delete-document.usecase";

@Module({
  imports: [EmployeeDocumentsModule],
  controllers: [DocumentsController],
  providers: [
    DocumentQueryRepository,
    EmployeeDocumentRepository,
    ListDocumentsUseCase,
    GetDocumentUseCase,
    CreateDocumentUseCase,
    UpdateDocumentUseCase,
    DeleteDocumentUseCase,
  ],
  exports: [DocumentQueryRepository],
})
export class DocumentsModule {}
