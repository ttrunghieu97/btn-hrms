import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { RedisService } from "../../infrastructure/redis/redis.service";
import Redis from "ioredis";

export type ChatPubSubHandler = (payload: unknown) => void;

@Injectable()
export class ChatPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatPubSubService.name);
  private subClient: Redis | null = null;
  private readonly handlers = new Map<string, ChatPubSubHandler[]>();

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    const mainClient = this.redisService.getClientOrNull();
    if (!mainClient) {
      this.logger.warn(
        "Redis not configured — chat pub/sub disabled (single-instance mode)",
      );
      return;
    }

    this.subClient = new Redis(mainClient.options);
    this.subClient.on("error", (err) => {
      this.logger.error(`Redis sub client error: ${err.message}`);
    });

    this.subClient.on("message", (channel: string, message: string) => {
      const fns = this.handlers.get(channel);
      if (!fns?.length) return;
      try {
        const parsed = JSON.parse(message);
        fns.forEach((fn) => fn(parsed));
      } catch (err: unknown  ) {
        this.logger.error(`Failed to parse pub/sub message: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  async publish(channel: string, payload: object): Promise<void> {
    const client = this.redisService.getClientOrNull();
    if (!client) return;
    try {
      await client.publish(channel, JSON.stringify(payload));
    } catch (err: unknown  ) {
      this.logger.error(`Publish failed on ${channel}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async subscribe(channel: string, handler: ChatPubSubHandler): Promise<void> {
    if (!this.subClient) return;
    const existing = this.handlers.get(channel);
    if (existing) {
      existing.push(handler);
      return;
    }
    this.handlers.set(channel, [handler]);
    await this.subClient.subscribe(channel);
    this.logger.log(`Subscribed to ${channel}`);
  }

  async onModuleDestroy() {
    if (!this.subClient) return;
    try {
      await this.subClient.quit();
    } catch {
      this.subClient.disconnect();
    }
  }
}




