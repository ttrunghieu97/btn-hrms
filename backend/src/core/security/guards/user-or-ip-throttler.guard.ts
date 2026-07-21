import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

/**
 * Per-user (when authenticated) or per-IP (anonymous) rate-limit tracker.
 *
 * Keys throttle counters by `user:<id>` if `req.user.id` is set by JwtAuthGuard,
 * otherwise falls back to `ip:<ip>`. This prevents one shared corporate IP
 * from globally exhausting the bucket for all users behind it, and gives
 * authenticated abuse a per-user attribution.
 *
 * In-memory storage only (default `@nestjs/throttler` ThrottlerStorageService).
 * No Redis required.
 */
@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const userId = (req as Request & { user?: { id?: string } })?.user?.id;
    if (userId) {
      return `user:${userId}`;
    }
    const ip = req.ip ?? "unknown";
    return `ip:${ip}`;
  }
}
