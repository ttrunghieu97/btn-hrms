import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import {
  DepartmentEnvelopeDto,
  DepartmentListEnvelopeDto,
} from "./dto/department-response.dto";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { DepartmentQueryDto } from "./dto/department-query.dto";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { DepartmentPolicies } from "../../../core/security/policies/department.policy";
import { ListDepartmentsFlatUseCase } from "./use-cases/list-departments-flat.usecase";
import { ListDepartmentsUseCase } from "./use-cases/list-departments.usecase";
import { GetDepartmentUseCase } from "./use-cases/get-department.usecase";
import { CreateDepartmentUseCase } from "./use-cases/create-department.usecase";
import { UpdateDepartmentUseCase } from "./use-cases/update-department.usecase";
import { DeleteDepartmentUseCase } from "./use-cases/delete-department.usecase";
import { GetDepartmentStatsUseCase } from "./use-cases/get-department-stats.usecase";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";

@ApiTags("Department Management")
@ApiBearerAuth()
@Controller()
export class DepartmentsController {
  constructor(
    private readonly listDepartmentsFlat: ListDepartmentsFlatUseCase,
    private readonly listDepartments: ListDepartmentsUseCase,
    private readonly getDepartment: GetDepartmentUseCase,
    private readonly createDepartment: CreateDepartmentUseCase,
    private readonly updateDepartment: UpdateDepartmentUseCase,
    private readonly deleteDepartment: DeleteDepartmentUseCase,
    private readonly getDepartmentStats: GetDepartmentStatsUseCase,
  ) {}

  @Get("stats")
  @CheckPolicy(DepartmentPolicies.view)
  @ApiOperation({ summary: "Get employee count stats per department" })
  getStats() {
    return this.getDepartmentStats.execute();
  }

  @Get("list")
  @CheckPolicy(DepartmentPolicies.view)
  @ApiOperation({ summary: "Get flat list of all departments (no pagination)" })
  @ApiOkResponse({ type: DepartmentListEnvelopeDto })
  findList(@Query() query: DepartmentQueryDto) {
    return this.listDepartmentsFlat.execute(query);
  }

  @Get()
  @CheckPolicy(DepartmentPolicies.view)
  @ApiOperation({ summary: "List departments with filtering and pagination" })
  @ApiOkResponse({ type: DepartmentListEnvelopeDto })
  findAll(@Query() query: DepartmentQueryDto) {
    return this.listDepartments.execute(query);
  }

  @Get(":id")
  @CheckPolicy(DepartmentPolicies.view)
  @ApiOperation({ summary: "Get department details by ID" })
  @ApiOkResponse({ type: DepartmentEnvelopeDto })
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: DepartmentQueryDto,
  ) {
    return this.getDepartment.execute(id, query);
  }

  @Post()
  @CheckPolicy(DepartmentPolicies.create)
  @AuditLog({ action: "department_create", entity: "department" })
  @ApiOperation({ summary: "Create a new department" })
  @ApiCreatedResponse({ type: DepartmentEnvelopeDto })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.createDepartment.execute(createDepartmentDto);
  }

  @Put(":id")
  @CheckPolicy(DepartmentPolicies.edit)
  @AuditLog({ action: "department_update", entity: "department" })
  @ApiOperation({ summary: "Update department details" })
  @ApiOkResponse({ type: DepartmentEnvelopeDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.updateDepartment.execute(id, updateDepartmentDto);
  }

  @Delete(":id")
  @CheckPolicy(DepartmentPolicies.delete)
  @AuditLog({ action: "department_delete", entity: "department" })
  @ApiOperation({ summary: "Remove a department" })
  remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.deleteDepartment.execute(id);
  }
}

