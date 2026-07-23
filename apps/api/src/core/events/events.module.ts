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
  ],
  exports: [
    EVENT_BUS_TOKEN,
    InternalEventBus,
    RedisDurableEventBus,
    EventOutboxRepository,
    EventOutboxService,
    EventOutboxDispatcherService,
    TracingService,
  ],
})
export class EventsModule {}
