import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { PayrollPolicies } from "../../../core/security/policies/payroll.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { UpsertSalaryStructureDto } from "./dto/upsert-salary-structure.dto";
import { SalaryStructureQueryDto } from "./dto/salary-structure-query.dto";
import {
  GetSalaryStructureUseCase,
  ListSalaryStructuresUseCase,
  UpsertSalaryStructureUseCase,
} from "./use-cases/salary-structures.usecases";

@ApiTags("Salary Structures")
@ApiBearerAuth()
@Controller()
export class SalaryStructuresController {
  constructor(
    private readonly listSalaryStructures: ListSalaryStructuresUseCase,
    private readonly getSalaryStructure: GetSalaryStructureUseCase,
    private readonly upsertSalaryStructure: UpsertSalaryStructureUseCase,
  ) {}

  @Get()
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "List salary structures" })
  list(@Query() query: SalaryStructureQueryDto) {
    return this.listSalaryStructures.execute(query);
  }

  @Get(":id")
  @CheckPolicy(PayrollPolicies.view)
  @ApiOperation({ summary: "Get salary structure" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getSalaryStructure.execute(id);
  }

  @Post()
  @CheckPolicy(PayrollPolicies.update)
  @AuditLog({ action: "salary_structure_upsert", entity: "salary_structure" })
  @ApiOperation({ summary: "Create current salary structure" })
  upsert(@Body() dto: UpsertSalaryStructureDto) {
    return this.upsertSalaryStructure.execute(dto);
  }
}



