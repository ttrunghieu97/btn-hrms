import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { RedisEventsService } from "./redis-events.service";
import { RedisService } from "./redis.service";

function createRedisClient(redisUrl: string | null): Redis | null {
  if (!redisUrl) return null;

  return new Redis(redisUrl, {
    lazyConnect: true,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
}

@Global()
@Module({
  providers: [
    {
      provide: "REDIS_URL",
      useFactory: (config: ConfigService) => {
        const redisUrl = String(config.get("REDIS_URL") || "").trim();
        return redisUrl || null;
      },
      inject: [ConfigService],
    },
    {
      provide: "REDIS_EVENTS_CLIENT",
      useFactory: (config: ConfigService) => {
        const redisUrl = String(config.get("REDIS_URL") || "").trim();
        return createRedisClient(redisUrl || null);
      },
      inject: [ConfigService],
    },
    RedisEventsService,
    RedisService,
  ],
  exports: [RedisEventsService, RedisService],
})
export class RedisModule {}
