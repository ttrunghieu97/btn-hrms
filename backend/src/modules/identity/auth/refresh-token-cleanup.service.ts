import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AuthRepository } from "./repositories/auth.repository";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { withCronLease } from "../../../shared/utils/cron-lease.util";

@Injectable()
export class RefreshTokenCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: ContextLogger;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly requestContext: RequestContextService,
    private readonly redis: RedisService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      RefreshTokenCleanupService.name,
    );
  }

  onModuleInit() {
    const enabled =
      String(process.env.AUTH_REFRESH_TOKEN_CLEANUP_ENABLED || "").toLowerCase() ===
      "true";
    if (!enabled) return;

    const intervalMs = Number(
      process.env.AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS || 60_000,
    );
    if (!Number.isFinite(intervalMs) || intervalMs < 10_000) {
      this.logger.warn(
        `Invalid AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS='${process.env.AUTH_REFRESH_TOKEN_CLEANUP_INTERVAL_MS}', using 60000`,
      );
    }

    const actualInterval =
      Number.isFinite(intervalMs) && intervalMs >= 10_000 ? intervalMs : 60_000;

    this.timer = setInterval(() => {
      void this.cleanup().catch((err) => {
        this.logger.error(
          `Refresh token cleanup failed: ${err?.message || err}`,
        );
      });
    }, actualInterval);
    this.timer.unref();

    this.logger.log(
      `Refresh token cleanup enabled (interval=${actualInterval}ms)`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async cleanup() {
    await withCronLease(
      this.redis.getClientOrNull(),
      "hrms:cron-lease:auth:refresh-token-cleanup",
      90,
      () => this.logger.debug("Skipping refresh token cleanup because another instance holds the lease"),
      async () => {
        const now = new Date();

        const deleted =
          await this.authRepo.deleteExpiredOrRevokedRefreshTokens(now);

        if (deleted > 0) {
          this.logger.log(`Deleted ${deleted} refresh tokens`);
        }
      },
    );
  }
}
