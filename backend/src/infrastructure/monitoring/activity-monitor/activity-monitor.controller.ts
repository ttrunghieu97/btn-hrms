import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { ListActivitiesUseCase } from "./use-cases/list-activities.usecase";
import { ActivityQueryDto } from "./dto/activity-query.dto";
import { ActivityListEnvelopeDto } from "./dto/activity-response.dto";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { ListDistinctActivityActionsUseCase } from "./use-cases/list-distinct-activity-actions.usecase";
import { ListDistinctActivityEntitiesUseCase } from "./use-cases/list-distinct-activity-entities.usecase";

@ApiTags("Activity Monitor")
@ApiBearerAuth()
@Controller()
export class ActivityMonitorController {
  constructor(
    private readonly listActivities: ListActivitiesUseCase,
    private readonly listDistinctActions: ListDistinctActivityActionsUseCase,
    private readonly listDistinctEntities: ListDistinctActivityEntitiesUseCase,
  ) {}

  @Get()
  @RequirePermission(Permissions.MONITORING_VIEW)
  @ApiOperation({ summary: "List recent system activities" })
  @ApiOkResponse({ type: ActivityListEnvelopeDto })
  async findAll(@Query() query: ActivityQueryDto) {
    return this.listActivities.execute(query);
  }

  @Get("actions")
  @RequirePermission(Permissions.MONITORING_VIEW)
  @ApiOperation({ summary: "Get distinct activity action types" })
  async getDistinctActions() {
    return this.listDistinctActions.execute();
  }

  @Get("entities")
  @RequirePermission(Permissions.MONITORING_VIEW)
  @ApiOperation({ summary: "Get distinct activity entity types" })
  async getDistinctEntities() {
    return this.listDistinctEntities.execute();
  }
}
