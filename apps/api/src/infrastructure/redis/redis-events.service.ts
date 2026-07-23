import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisEventsService {
  constructor(@Inject("REDIS_EVENTS_CLIENT") private readonly redis: Redis | null) {}

  getClientOrNull(): Redis | null {
    return this.redis;
  }

  getClient(): Redis {
    if (!this.redis) throw new Error("Redis events is not configured");
    return this.redis;
  }
}
