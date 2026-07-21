import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisCacheService {
  private readonly prefix = "hrms:cache:";

  constructor(@Inject("REDIS_CACHE_CLIENT") private readonly redis: Redis | null) {}

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    const raw = await this.redis.get(this.prefix + key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      await this.redis.del(this.prefix + key);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.redis) throw new Error("Redis cache is not configured");
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error("Redis cache TTL must be a positive number");
    }
    await this.redis.set(
      this.prefix + key,
      JSON.stringify(value),
      "EX",
      Math.floor(ttlSeconds),
    );
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(this.prefix + key);
  }
}
