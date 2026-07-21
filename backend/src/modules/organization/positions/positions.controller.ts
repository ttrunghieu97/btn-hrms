import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { PositionListEnvelopeDto } from "./dto/position-response.dto";
import { PositionQueryDto } from "./dto/position-query.dto";
import { CreatePositionDto } from "./dto/create-position.dto";
import { UpdatePositionDto } from "./dto/update-position.dto";
import { ListPositionsUseCase } from "./use-cases/list-positions.usecase";
import { CreatePositionUseCase } from "./use-cases/create-position.usecase";
import { UpdatePositionUseCase } from "./use-cases/update-position.usecase";
import { DeletePositionUseCase } from "./use-cases/delete-position.usecase";

@ApiTags("Positions")
@ApiBearerAuth()
@Controller()
export class PositionsController {
  constructor(
    private readonly listPositions: ListPositionsUseCase,
    private readonly createPosition: CreatePositionUseCase,
    private readonly updatePosition: UpdatePositionUseCase,
    private readonly deletePosition: DeletePositionUseCase,
  ) {}

  @Get()
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List active positions" })
  @ApiOkResponse({ type: PositionListEnvelopeDto })
  findAll(@Query() query: PositionQueryDto) {
    return this.listPositions.execute(query);
  }

  @Post()
  @CheckPolicy(EmployeePolicies.create)
  @ApiOperation({ summary: "Create a new position" })
  @ApiCreatedResponse({ description: "Position created" })
  async create(@Body() dto: CreatePositionDto) {
    const id = await this.createPosition.execute(dto);
    return { data: { id }, error: null };
  }

  @Patch(":id")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Update position" })
  @ApiOkResponse({ description: "Position updated" })
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    await this.updatePosition.execute(id, dto);
    return { data: { id }, error: null };
  }

  @Delete(":id")
  @CheckPolicy(EmployeePolicies.delete)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a position" })
  @ApiNoContentResponse({ description: "Position deleted" })
  async remove(@Param("id", new ParseUUIDPipe()) id: string) {
    await this.deletePosition.execute(id);
  }
}

