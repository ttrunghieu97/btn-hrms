import { Injectable } from "@nestjs/common";
import { DatabaseHealthIndicator } from "../../infrastructure/database/database-health.indicator";
import { StorageService } from "../../infrastructure/storage/storage.service";
import { RedisDurableEventBus } from "../../core/events/redis-durable-event-bus.service";

@Injectable()
export class GetReadinessUseCase {
  constructor(
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly storage: StorageService,
    private readonly eventBus: RedisDurableEventBus,
  ) {}

  async execute() {
    const timestamp = new Date().toISOString();
    const database = await this.databaseHealth.check();
    const storage = await this.storage.healthCheck();
    const eventBus = await this.eventBus.healthCheck();
    const status =
      database.status === "up" && storage.ok && eventBus.ok
        ? "ready"
        : "degraded";

    return {
      status,
      timestamp,
      database: {
        ok: database.status === "up",
        latencyMs: database.latencyMs,
      },
      storage,
      eventBus,
    };
  }
}
