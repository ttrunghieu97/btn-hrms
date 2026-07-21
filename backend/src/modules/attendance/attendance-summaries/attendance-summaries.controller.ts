import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AttendancePolicies } from "../../../core/security/policies/attendance.policy";
import { AttendanceSummaryQueryDto } from "./dto/attendance-summary-query.dto";
import {
  GetAttendanceSummaryUseCase,
  ListAttendanceSummariesUseCase,
} from "./use-cases/attendance-summaries.usecases";

@ApiTags("Attendance Summaries")
@ApiBearerAuth()
@Controller()
export class AttendanceSummariesController {
  constructor(
    private readonly listSummaries: ListAttendanceSummariesUseCase,
    private readonly getSummary: GetAttendanceSummaryUseCase,
  ) {}

  @Get()
  @CheckPolicy(AttendancePolicies.report)
  @ApiOperation({ summary: "List attendance daily summaries" })
  @ApiOkResponse({ description: "List of daily summaries" })
  list(@Query() query: AttendanceSummaryQueryDto) {
    return this.listSummaries.execute(query);
  }

  @Get(":id")
  @CheckPolicy(AttendancePolicies.report)
  @ApiOperation({ summary: "Get attendance daily summary" })
  @ApiOkResponse({ description: "Daily summary details" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getSummary.execute(id);
  }
}



