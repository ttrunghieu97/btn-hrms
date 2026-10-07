import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { userPermissionsCacheKey } from "./permission-cache.util";
import { GetUserPermissionsUseCase } from "./use-cases/get-user-permissions.usecase";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { ContextLogger } from "../../../shared/logging/context-logger";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class PermissionCacheService {
  private readonly logger: ContextLogger;
  private readonly CACHE_TTL_SECONDS = 30 * 60;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly getUserPermissions: GetUserPermissionsUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      PermissionCacheService.name,
    );
  }

  /**
   * Get user permissions from cache or DB.
   * Cache key: perm:user:{userId}
   */
  async getPermissions(userId: string): Promise<string[]> {
    const cacheKey = userPermissionsCacheKey(userId);

    // 1. Check cache
    try {
      const cached = await this.cacheManager.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error: unknown) {
      this.logger.error({
        msg: "permission_cache_read_failed",
        reason: errorMessage(error),
      });
    }

    // 2. Cache miss -> load from DB
    const permissions = await this.getUserPermissions.execute(userId);

    // 3. Set cache
    try {
      await this.cacheManager.set(
        cacheKey,
        permissions,
        this.CACHE_TTL_SECONDS,
      );
    } catch (error: unknown) {
      this.logger.error({
        msg: "permission_cache_write_failed",
        reason: errorMessage(error),
      });
    }

    return permissions;
  }

  /**
   * Invalidate user permissions cache.
   */
  async invalidate(userId: string): Promise<void> {
    const cacheKey = userPermissionsCacheKey(userId);
    try {
      await this.cacheManager.del(cacheKey);
    } catch (error: unknown) {
      this.logger.error({
        msg: "permission_cache_invalidation_failed",
        reason: errorMessage(error),
      });
    }
  }

  /**
   * Invalidate permissions cache for multiple users (best-effort).
   */
  async invalidateMany(userIds: string[]): Promise<void> {
    await Promise.allSettled(
      userIds.map((id) => this.invalidate(id)),
    );
  }
}
