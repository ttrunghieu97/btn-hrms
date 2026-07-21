import { Global, Module } from "@nestjs/common";
import { MetricsModule } from "../../shared/metrics/metrics.module";
import { IdempotencyRepository } from "./idempotency.repository";
import { IdempotencyService } from "./idempotency.service";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

@Global()
@Module({
  imports: [MetricsModule],
  providers: [
    IdempotencyRepository,
    IdempotencyService,
    IdempotencyInterceptor,
  ],
  exports: [
    IdempotencyRepository,
    IdempotencyService,
    IdempotencyInterceptor,
  ],
})
export class IdempotencyModule {}
