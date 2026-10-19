import {
  Body, Controller, Get, Optional, Param, Patch, Post, Query, Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { ListContractsUseCase } from "./use-cases/list-contracts.usecase";
import { GetContractUseCase } from "./use-cases/get-contract.usecase";
import { CreateContractUseCase } from "./use-cases/create-contract.usecase";
import { AmendContractUseCase } from "./use-cases/amend-contract.usecase";
import { GetContractHistoryUseCase } from "./use-cases/get-contract-history.usecase";
import { ListContractsQueryDto, CreateContractDto, UpdateContractDto } from "./dto/contracts.dto";
import { ContractHistoryItemDto } from "./dto/contract-response.dto";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { PaginatedEnvelopeDto, ApiEnvelopeDto } from "../../../shared/dto/api-response.dto";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";

@ApiTags("Contracts")
@ApiBearerAuth()
@Controller("contracts")
export class ContractsController {
  constructor(
    private readonly listContracts: ListContractsUseCase,
    private readonly getContract: GetContractUseCase,
    private readonly createContract: CreateContractUseCase,
    private readonly amendContract: AmendContractUseCase,
    private readonly getContractHistory: GetContractHistoryUseCase,
    @Optional() private readonly queryScopeService?: QueryScopeService,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List contracts with pagination, filter, and sort" })
  @ApiOkResponse({ type: PaginatedEnvelopeDto })
  async findAll(
    @Query() query: ListContractsQueryDto,
    @Req() req?: { user?: AuthUser },
  ) {
    const scope =
      req?.user && this.queryScopeService
        ? this.queryScopeService.resolveScope(req.user, "employees")
        : undefined;
    const result = await this.listContracts.execute(query, scope);
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
  @ApiOperation({ summary: "Get contract by ID" })
  @ApiOkResponse({ type: ApiEnvelopeDto })
  async findOne(
    @Param("id") id: string,
    @Req() req?: { user?: AuthUser },
  ) {
    const scope =
      req?.user && this.queryScopeService
        ? this.queryScopeService.resolveScope(req.user, "employees")
        : undefined;
    const contract = await this.getContract.execute(id, scope);
    return {
      data: contract,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Get(":id/history")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get contract version history" })
  @ApiOkResponse({ type: [ContractHistoryItemDto] })
  async history(
    @Param("id") id: string,
    @Req() req?: { user?: AuthUser },
  ) {
    const scope =
      req?.user && this.queryScopeService
        ? this.queryScopeService.resolveScope(req.user, "employees")
        : undefined;
    const history = await this.getContractHistory.execute(id, scope);
    return {
      data: history,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Post()
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "contract_create", entity: "employee" })
  @ApiOperation({ summary: "Create a new contract" })
  @ApiOkResponse({ type: ApiEnvelopeDto })
  async create(
    @Body() dto: CreateContractDto,
    @Req() req?: { user?: AuthUser },
  ) {
    const scope =
      req?.user && this.queryScopeService
        ? this.queryScopeService.resolveScope(req.user, "employees")
        : undefined;
    const contract = await this.createContract.execute(dto, scope);
    return {
      data: contract,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Patch(":id")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "contract_amend", entity: "employee" })
  @ApiOperation({ summary: "Amend an existing contract (creates a new version)" })
  @ApiOkResponse({ type: ApiEnvelopeDto })
  async amend(
    @Param("id") id: string,
    @Body() dto: UpdateContractDto,
    @Req() req?: { user?: AuthUser },
  ) {
    const scope =
      req?.user && this.queryScopeService
        ? this.queryScopeService.resolveScope(req.user, "employees")
        : undefined;
    const contract = await this.amendContract.execute(id, dto, scope);
    return {
      data: contract,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
