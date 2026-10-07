import { Injectable } from "@nestjs/common";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { SystemHealthRepository } from "../repositories/system-health.repository";
import { RedisService } from "../../../../infrastructure/redis/redis.service";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import type { SystemHealthResponseDto, ComponentHealthDto } from "../dto/system-health-response.dto";

@Injectable()
export class GetSystemHealthUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly systemHealthRepo: SystemHealthRepository,
    private readonly requestContext: RequestContextService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetSystemHealthUseCase.name);
  }

  async execute(): Promise<SystemHealthResponseDto> {
    const components: ComponentHealthDto[] = [];
    let totalLatencyMs = 0;

    const dbResult = await this.checkComponent("database", () => this.checkDatabase());
    components.push(dbResult);
    totalLatencyMs += dbResult.latencyMs;

    const redisResult = await this.checkComponent("redis", () => this.checkRedis());
    components.push(redisResult);
    totalLatencyMs += redisResult.latencyMs;

    const s3Result = await this.checkComponent("s3", () => this.checkS3());
    components.push(s3Result);
    totalLatencyMs += s3Result.latencyMs;

    await this.recordHealthCheck(dbResult);

    const unhealthy = components.filter((c) => c.status !== "healthy");
    const overallStatus = unhealthy.length === 0
      ? "healthy"
      : unhealthy.some((c) => c.status === "down")
        ? "down"
        : "degraded";

    return {
      overallStatus,
      components,
      checkedAt: new Date().toISOString(),
      totalLatencyMs,
    };
  }

  private async checkComponent(
    name: string,
    checkFn: () => Promise<Pick<ComponentHealthDto, "status" | "latencyMs" | "error">>,
  ): Promise<ComponentHealthDto> {
    const start = Date.now();
    try {
      const result = await checkFn();
      return { name, ...result };
    } catch (err: unknown) {
      const elapsed = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { name, status: "down", latencyMs: elapsed, error: errorMessage };
    }
  }

  private async checkDatabase(): Promise<Pick<ComponentHealthDto, "status" | "latencyMs" | "error">> {
    const start = Date.now();
    try {
      await this.systemHealthRepo.pingDatabase();
      const latencyMs = Date.now() - start;
      return { status: "healthy", latencyMs, error: null };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : "Database connection failed";
      return { status: "down", latencyMs, error: errorMessage };
    }
  }

  private async checkRedis(): Promise<Pick<ComponentHealthDto, "status" | "latencyMs" | "error">> {
    const start = Date.now();
    const client = this.redis.getClientOrNull();
    if (!client) {
      return { status: "degraded", latencyMs: 0, error: "Redis not configured" };
    }
    try {
      await client.ping();
      return { status: "healthy", latencyMs: Date.now() - start, error: null };
    } catch (err: unknown) {
      return { status: "down", latencyMs: Date.now() - start, error: (err as Error).message };
    }
  }

  private async checkS3(): Promise<Pick<ComponentHealthDto, "status" | "latencyMs" | "error">> {
    const start = Date.now();
    try {
      const result = await this.storage.healthCheck();
      return {
        status: result.ok ? "healthy" : "degraded",
        latencyMs: Date.now() - start,
        error: result.detail ?? null,
      };
    } catch (err: unknown) {
      return { status: "down", latencyMs: Date.now() - start, error: (err as Error).message };
    }
  }

  private async recordHealthCheck(component: ComponentHealthDto): Promise<void> {
    try {
      await this.systemHealthRepo.insertHealthCheck(component);
    } catch (err) {
      this.logger.warn("Failed to persist health check result", { error: err });
    }
  }
}
