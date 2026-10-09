import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Permissions } from "@/core/security/permissions/permissions.registry";
import { RequirePermission } from "@/core/security/decorators/require-permission.decorator";
import { ListDeadLettersUseCase } from "./use-cases/list-dead-letters.usecase";
import { GetDeadLetterUseCase } from "./use-cases/get-dead-letter.usecase";
import { ReplayDeadLetterUseCase } from "./use-cases/replay-dead-letter.usecase";
import { ReplayAllDeadLettersUseCase } from "./use-cases/replay-all-dead-letters.usecase";
import { DiscardDeadLetterUseCase } from "./use-cases/discard-dead-letter.usecase";

@ApiTags("Event DLQ")
@ApiBearerAuth()
@Controller("admin/events/dead-letters")
@RequirePermission(Permissions.SYS_ALL)
export class EventDlqController {
  constructor(
    private readonly listDeadLettersUseCase: ListDeadLettersUseCase,
    private readonly getDeadLetterUseCase: GetDeadLetterUseCase,
    private readonly replayDeadLetterUseCase: ReplayDeadLetterUseCase,
    private readonly replayAllDeadLettersUseCase: ReplayAllDeadLettersUseCase,
    private readonly discardDeadLetterUseCase: DiscardDeadLetterUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "List dead-lettered outbox events with pagination" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async list(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const result = await this.listDeadLettersUseCase.execute({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return result;
  }

  @Get(":id")
  @ApiOperation({ summary: "Inspect a dead-lettered event by ID" })
  async inspect(@Param("id") id: string) {
    return this.getDeadLetterUseCase.execute(id);
  }

  @Post(":id/replay")
  @ApiOperation({ summary: "Reset a dead-lettered event for retry" })
  async replay(@Param("id") id: string) {
    return this.replayDeadLetterUseCase.execute({ id });
  }

  @Post("replay-all")
  @ApiOperation({ summary: "Reset all dead-lettered events for retry" })
  async replayAll() {
    return this.replayAllDeadLettersUseCase.execute();
  }

  @Post(":id/discard")
  @ApiOperation({ summary: "Discard a dead-lettered event" })
  async discard(
    @Param("id") id: string,
    @Body() body?: { reason?: string; permanent?: boolean },
  ) {
    return this.discardDeadLetterUseCase.execute({
      id,
      reason: body?.reason,
      permanent: body?.permanent,
    });
  }

  @Delete(":id")
  @ApiOperation({ summary: "Discard/delete a dead-lettered event" })
  async delete(
    @Param("id") id: string,
    @Query("permanent") permanent?: string,
  ) {
    return this.discardDeadLetterUseCase.execute({
      id,
      permanent: permanent === "true",
    });
  }
}
