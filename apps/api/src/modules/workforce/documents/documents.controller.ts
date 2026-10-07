import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { ListDocumentsUseCase } from "./use-cases/list-documents.usecase";
import { GetDocumentUseCase } from "./use-cases/get-document.usecase";
import { CreateDocumentUseCase } from "./use-cases/create-document.usecase";
import { UpdateDocumentUseCase } from "./use-cases/update-document.usecase";
import { DeleteDocumentUseCase } from "./use-cases/delete-document.usecase";
import { ListDocumentsQueryDto, CreateDocumentDto, UpdateDocumentDto } from "./dto/documents.dto";

@ApiTags("Documents")
@ApiBearerAuth()
@Controller("documents")
export class DocumentsController {
  constructor(
    private readonly listDocuments: ListDocumentsUseCase,
    private readonly getDocument: GetDocumentUseCase,
    private readonly createDocument: CreateDocumentUseCase,
    private readonly updateDocument: UpdateDocumentUseCase,
    private readonly deleteDocument: DeleteDocumentUseCase,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List documents with pagination, filter, and sort" })
  async findAll(@Query() query: ListDocumentsQueryDto) {
    const result = await this.listDocuments.execute(query);
    return {
      data: result.rows,
      meta: {
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasNext: result.page * result.limit < result.total,
        },
        requestId: "",
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }

  @Get(":id")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get document by ID" })
  async findOne(@Param("id") id: string) {
    const doc = await this.getDocument.execute(id);
    return {
      data: doc,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post()
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "document_create", entity: "employee" })
  @ApiOperation({ summary: "Create a new document" })
  async create(@Body() dto: CreateDocumentDto) {
    const doc = await this.createDocument.execute(dto);
    return {
      data: doc,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Patch(":id")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "document_update", entity: "employee" })
  @ApiOperation({ summary: "Update a document" })
  async update(@Param("id") id: string, @Body() dto: UpdateDocumentDto) {
    const doc = await this.updateDocument.execute(id, dto);
    return {
      data: doc,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Delete(":id")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "document_delete", entity: "employee" })
  @ApiOperation({ summary: "Delete a document" })
  async delete(@Param("id") id: string) {
    await this.deleteDocument.execute(id);
    return {
      data: { success: true },
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
