import { Global, Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { EVENT_BUS_TOKEN } from "./event-bus.interface";
import { InternalEventBus } from "./internal-event-bus";
import { RedisDurableEventBus } from "./redis-durable-event-bus.service";
import { AttendanceCheckedHandler } from "./handlers/attendance-checked.handler";
import { PayrollGeneratedHandler } from "./handlers/payroll-generated.handler";
import { MetricsModule } from "../../shared/metrics/metrics.module";
import { EventOutboxRepository } from "./event-outbox.repository";
import { EventOutboxService } from "./event-outbox.service";
import { EventOutboxDispatcherService } from "./event-outbox-dispatcher.service";
import { TracingService } from "../../shared/context/tracing.service";
import { EventDlqController } from "./event-dlq.controller";
import { isBootstrapFlagEnabled } from "../../shared/config/startup-flags";

import { ListDeadLettersUseCase } from "./use-cases/list-dead-letters.usecase";
import { GetDeadLetterUseCase } from "./use-cases/get-dead-letter.usecase";
import { ReplayDeadLetterUseCase } from "./use-cases/replay-dead-letter.usecase";
import { ReplayAllDeadLettersUseCase } from "./use-cases/replay-all-dead-letters.usecase";
import { DiscardDeadLetterUseCase } from "./use-cases/discard-dead-letter.usecase";

@Global()
@Module({
  imports: [EventEmitterModule.forRoot(), MetricsModule],
  controllers: [EventDlqController],
  providers: [
    InternalEventBus,
    RedisDurableEventBus,
    {
      provide: EVENT_BUS_TOKEN,
      useFactory: (
        config: ConfigService,
        internalBus: InternalEventBus,
        redisBus: RedisDurableEventBus,
      ) => {
        const redisConfigured = Boolean(
          String(config.get("REDIS_URL") || "").trim(),
        );
        const useRedisBus =
          redisConfigured &&
          isBootstrapFlagEnabled("FEATURE_REDIS_EVENT_BUS", false, true);

        return useRedisBus ? redisBus : internalBus;
      },
      inject: [ConfigService, InternalEventBus, RedisDurableEventBus],
    },
    EventOutboxRepository,
    EventOutboxService,
    EventOutboxDispatcherService,
    TracingService,
    AttendanceCheckedHandler,
    PayrollGeneratedHandler,
    ListDeadLettersUseCase,
    GetDeadLetterUseCase,
    ReplayDeadLetterUseCase,
    ReplayAllDeadLettersUseCase,
    DiscardDeadLetterUseCase,
  ],
  exports: [
    EVENT_BUS_TOKEN,
    InternalEventBus,
    RedisDurableEventBus,
    EventOutboxRepository,
    EventOutboxService,
    EventOutboxDispatcherService,
    TracingService,
    ListDeadLettersUseCase,
    GetDeadLetterUseCase,
    ReplayDeadLetterUseCase,
    ReplayAllDeadLettersUseCase,
    DiscardDeadLetterUseCase,
  ],
})
export class EventsModule {}
