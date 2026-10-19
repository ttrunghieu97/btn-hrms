import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AttendancePolicies } from "../../../core/security/policies/attendance.policy";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
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
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "List attendance daily summaries" })
  @ApiOkResponse({ description: "List of daily summaries" })
  list(
    @Query() query: AttendanceSummaryQueryDto,
    @Request() req?: { user?: AuthUser },
  ) {
    return this.listSummaries.execute(query, req?.user);
  }

  @Get(":id")
  @CheckPolicy(AttendancePolicies.view)
  @ApiOperation({ summary: "Get attendance daily summary" })
  @ApiOkResponse({ description: "Daily summary details" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getSummary.execute(id);
  }
}



