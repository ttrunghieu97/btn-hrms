import { Injectable } from "@nestjs/common";
import { DatabaseHealthIndicator } from "../../infrastructure/database/database-health.indicator";
import { StorageService } from "../../infrastructure/storage/storage.service";
import { RedisDurableEventBus } from "../../core/events/redis-durable-event-bus.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

@Injectable()
export class GetReadinessUseCase {
  constructor(
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly storage: StorageService,
    private readonly eventBus: RedisDurableEventBus,
    private readonly redisService: RedisService,
  ) {}

  async execute() {
    const timestamp = new Date().toISOString();
    const database = await this.databaseHealth.check();
    const storage = await this.storage.healthCheck();
    const eventBus = await this.eventBus.healthCheck();

    let redisOk = true;
    let redisLatencyMs: number | null = null;
    const client = this.redisService.getClientOrNull();
    if (client) {
      const t0 = performance.now();
      try {
        const pingRes = await client.ping();
        redisOk = pingRes === "PONG";
        redisLatencyMs = Math.round(performance.now() - t0);
      } catch {
        redisOk = false;
      }
    }

    const status =
      database.status === "up" && redisOk && storage.ok && eventBus.ok
        ? "ready"
        : "degraded";

    return {
      status,
      timestamp,
      database: {
        ok: database.status === "up",
        latencyMs: database.latencyMs,
      },
      redis: {
        ok: redisOk,
        latencyMs: redisLatencyMs,
      },
      storage,
      eventBus,
    };
  }
}
