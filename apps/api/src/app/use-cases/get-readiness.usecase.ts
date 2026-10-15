import { Injectable, Optional } from "@nestjs/common";
import { DatabaseHealthIndicator } from "../../infrastructure/database/database-health.indicator";
import { StorageService } from "../../infrastructure/storage/storage.service";
import { RedisDurableEventBus } from "../../core/events/redis-durable-event-bus.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { FacePresenceService } from "../../modules/attendance/attendances/services/face-presence.service";
import { EmailDeliveryService } from "../../modules/platform-notifications/channels/email-delivery.service";
import { SmsDeliveryService } from "../../modules/platform-notifications/channels/sms-delivery.service";
import { PushDeliveryService } from "../../modules/platform-notifications/channels/push-delivery.service";

@Injectable()
export class GetReadinessUseCase {
  constructor(
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly storage: StorageService,
    private readonly eventBus: RedisDurableEventBus,
    private readonly redisService: RedisService,
    @Optional() private readonly facePresence?: FacePresenceService,
    @Optional() private readonly emailDelivery?: EmailDeliveryService,
    @Optional() private readonly smsDelivery?: SmsDeliveryService,
    @Optional() private readonly pushDelivery?: PushDeliveryService,
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

    const faceDiag = (this.facePresence ?? new FacePresenceService()).getDiagnostics();
    const emailDiag = (this.emailDelivery ?? new EmailDeliveryService()).getDiagnostics();
    const smsDiag = (this.smsDelivery ?? new SmsDeliveryService()).getDiagnostics();
    const pushDiag = (this.pushDelivery ?? new PushDeliveryService()).getDiagnostics();

    const adaptersReady =
      faceDiag.configured &&
      !faceDiag.simulated &&
      emailDiag.configured &&
      !emailDiag.simulated &&
      smsDiag.configured &&
      !smsDiag.simulated &&
      pushDiag.configured &&
      !pushDiag.simulated;

    const productionReady = status === "ready" && adaptersReady;

    return {
      status,
      productionReady,
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
      adapters: {
        facePresence: faceDiag,
        notifications: {
          email: {
            provider: emailDiag.provider,
            configured: emailDiag.configured,
            simulated: emailDiag.simulated,
          },
          sms: {
            provider: smsDiag.provider,
            configured: smsDiag.configured,
            simulated: smsDiag.simulated,
          },
          push: {
            provider: pushDiag.provider,
            configured: pushDiag.configured,
            simulated: pushDiag.simulated,
          },
        },
      },
    };
  }
}
