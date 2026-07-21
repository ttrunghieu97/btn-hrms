import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../core/security/decorators/public.decorator";
import { GetReadinessUseCase } from "./use-cases/get-readiness.usecase";
import { GetStrictReadinessUseCase } from "./use-cases/get-strict-readiness.usecase";

@ApiTags("Basic Operations")
@Controller()
export class AppController {
  constructor(
    private readonly getReadiness: GetReadinessUseCase,
    private readonly getStrictReadiness: GetStrictReadinessUseCase,
  ) {}

  @Get("health")
  @Public()
  @ApiOperation({ summary: "Internal check for root API" })
  getHealth() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @Public()
  @ApiOperation({ summary: "Readiness check with database connectivity" })
  async getReady() {
    return this.getReadiness.execute();
  }

  @Get("ready/strict")
  @Public()
  @ApiOperation({
    summary: "Strict readiness check (returns 503 when any dependency is down)",
  })
  async getReadyStrict() {
    return this.getStrictReadiness.execute();
  }
}
