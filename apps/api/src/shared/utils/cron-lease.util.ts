import { randomUUID } from "crypto";
import type Redis from "ioredis";

function isRedisUnavailable(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Stream isn't writeable") ||
    message.includes("enableOfflineQueue options is false") ||
    message.includes("Connection is closed")
  );
}

async function releaseLease(redis: Redis, key: string, token: string) {
  await redis.eval(
    `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      end
      return 0
    `,
    1,
    key,
    token,
  );
}

export async function withCronLease<T>(
  redis: Redis | null,
  key: string,
  ttlSeconds: number,
  onSkipped: () => void,
  handler: () => Promise<T>,
): Promise<T | undefined> {
  // No Redis — single-instance mode, run handler directly (no distributed lock needed)
  if (!redis) {
    return handler();
  }

  if (redis.status !== "ready") {
    return undefined;
  }

  const token = randomUUID();
  let acquired: string | null;
  try {
    acquired = await redis.set(key, token, "EX", ttlSeconds, "NX");
  } catch (err) {
    if (!isRedisUnavailable(err)) throw err;
    return undefined;
  }

  if (!acquired) {
    onSkipped();
    return undefined;
  }

  try {
    return await handler();
  } finally {
    await releaseLease(redis, key, token).catch(() => undefined);
  }
}
