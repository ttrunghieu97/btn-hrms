import { Global, Module, Logger } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";

/**
 * Shared BullMQ configuration for the entire application.
 *
 * Creates a connection from REDIS_URL (parsed for host/port/user/pass).
 * BullMQ is skipped entirely if REDIS_URL is unset.
 *
 * Registered globally so any module can inject queues or processors.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = String(config.get("REDIS_URL") || "").trim();
        const defaultJobOptions = {
          attempts: 3,
          backoff: { type: "exponential" as const, delay: 2000 },
          removeOnComplete: { age: 86_400 }, // keep 1 day
          removeOnFail: { age: 604_800 }, // keep 1 week
        };

        if (!redisUrl) {
          const logger = new Logger("BullModule");
          logger.warn("REDIS_URL not configured — BullMQ disabled");
          // Return a dummy config that will never connect. Workers must guard
          // against this with getClientOrNull() before enqueuing jobs.
          return { connection: null as unknown as { host: string }, defaultJobOptions };
        }

        try {
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname || "localhost",
              port: Number(url.port) || 6379,
              username: url.username ? decodeURIComponent(url.username) : undefined,
              password: url.password ? decodeURIComponent(url.password) : undefined,
            },
            defaultJobOptions,
          };
        } catch {
          const logger = new Logger("BullModule");
          logger.warn(`REDIS_URL parse failed — BullMQ disabled`);
          return { connection: null as unknown as { host: string }, defaultJobOptions };
        }
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
