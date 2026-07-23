import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "@/core/security/decorators/check-policy.decorator";
import { LeavePolicies } from "@/core/security/policies/leave.policy";
import { LeaveTraceRepository } from "./leave-trace.repository";

@ApiTags("Leave Trace")
@ApiBearerAuth()
@Controller("api/v1/leave")
export class LeaveTraceController {
  constructor(private readonly traceService: LeaveTraceRepository) {}

  @Get(":id/trace")
  @CheckPolicy(LeavePolicies.view)
  @ApiOperation({ summary: "Get full event trace for a leave request" })
  trace(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.traceService.trace(id);
  }
}
