import {
  Body, Controller, Get, Param, Patch, Post, Query, Req,
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
import { ContractResponseDto, ContractHistoryItemDto } from "./dto/contract-response.dto";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { Employee } from "../../../core/security/types/resource-entities";
import { PaginatedEnvelopeDto, ApiEnvelopeDto } from "../../../shared/dto/api-response.dto";

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
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List contracts with pagination, filter, and sort" })
  @ApiOkResponse({ type: PaginatedEnvelopeDto })
  async findAll(@Query() query: ListContractsQueryDto) {
    const result = await this.listContracts.execute(query);
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
  async findOne(@Param("id") id: string) {
    const contract = await this.getContract.execute(id);
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
  async history(@Param("id") id: string) {
    const history = await this.getContractHistory.execute(id);
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
  async create(@Body() dto: CreateContractDto) {
    const contract = await this.createContract.execute(dto);
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
  async amend(@Param("id") id: string, @Body() dto: UpdateContractDto) {
    const contract = await this.amendContract.execute(id, dto);
    return {
      data: contract,
      meta: { requestId: "", timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
