import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { Employee } from "../../../core/security/types/resource-entities";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { CreateEmployeeDocumentDto } from "./dto/create-employee-document.dto";
import { ListEmployeeDocumentsUseCase } from "./use-cases/list-employee-documents.usecase";
import { CreateEmployeeDocumentUseCase } from "./use-cases/create-employee-document.usecase";
import { DeleteEmployeeDocumentUseCase } from "./use-cases/delete-employee-document.usecase";

@ApiTags("Employee Documents")
@ApiBearerAuth()
@Resource(Employee, "employeeId")
@Controller("employees/:employeeId/documents")
export class EmployeeDocumentsController {
  constructor(
    private readonly listDocs: ListEmployeeDocumentsUseCase,
    private readonly createDoc: CreateEmployeeDocumentUseCase,
    private readonly deleteDoc: DeleteEmployeeDocumentUseCase,
  ) {}

  @Get()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List employee documents" })
  list(@Param("employeeId") employeeId: string) {
    return this.listDocs.execute(employeeId);
  }

  @Post()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Add employee document" })
  create(
    @Param("employeeId") employeeId: string,
    @Body() dto: CreateEmployeeDocumentDto,
  ) {
    return this.createDoc.execute(employeeId, dto);
  }

  @Delete(":documentId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Delete employee document" })
  remove(
    @Param("employeeId") employeeId: string,
    @Param("documentId") documentId: string,
  ) {
    return this.deleteDoc.execute(employeeId, documentId);
  }
}

