import { Injectable, Logger, Inject, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis | null;

  constructor(@Inject("REDIS_URL") private readonly redisUrl: string | null) {
    if (!this.redisUrl) {
      this.redis = null;
      this.logger.warn("Redis disabled because REDIS_URL is not configured.");
      return;
    }

    this.redis = new Redis(this.redisUrl, {
      lazyConnect: true,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on("error", (err) => {
      this.logger.error(`Redis Error: ${err.message}`, err.stack);
    });
    this.redis.on("ready", () => {
      this.logger.log("Connected to Redis successfully");
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.connect();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Redis connection failed on init: ${message}. Will retry on first use.`,
      );
    }
  }

  /**
   * Get the underlying redis client if raw access is needed (use sparingly)
   */
  getClient(): Redis {
    if (!this.redis) {
      throw new Error("Redis is not configured");
    }

    return this.redis;
  }

  getClientOrNull(): Redis | null {
    return this.redis;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
