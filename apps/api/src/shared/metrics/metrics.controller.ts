import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../core/security/decorators/public.decorator";
import { MetricsService } from "./metrics.service";

@ApiTags("Observability")
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async getMetrics() {
    return this.metrics.getMetrics();
  }
}
