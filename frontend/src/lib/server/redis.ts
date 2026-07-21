import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const KEY_PREFIX = 'hrms:web:';

const BREAK_DURATION_MS = 10_000;

let client: Redis | null = null;
let connecting: Promise<Redis | null> | null = null;
let circuitOpenUntil = 0;

function createClient(): Redis | null {
  if (!REDIS_URL) return null;
  const redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      return Math.min(times * 50, 2000);
    },
  });

  redis.on('error', (err: Error) => {
    console.error('[redis]', err.message);
  });

  return redis;
}

async function connect(): Promise<Redis | null> {
  if (client) return client;

  if (Date.now() < circuitOpenUntil) {
    return null;
  }

  if (connecting) return connecting;

  connecting = (async () => {
    const c = createClient();
    if (!c) return null;
    try {
      await c.connect();
      client = c;
      circuitOpenUntil = 0;
      return c;
    } catch (err: unknown) {
      circuitOpenUntil = Date.now() + BREAK_DURATION_MS;
      console.error('[redis] connect failed, circuit open for 10s:', err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

function prefixed(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = await connect();
  if (!r) return null;
  try {
    const raw = await r.get(prefixed(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlMs: number): Promise<void> {
  const r = await connect();
  if (!r) return;
  try {
    await r.set(prefixed(key), JSON.stringify(value), 'PX', ttlMs);
  } catch {
    // cache is non-critical
  }
}

export async function cacheDel(key: string): Promise<void> {
  const r = await connect();
  if (!r) return;
  try {
    await r.del(prefixed(key));
  } catch {
    // cache is non-critical
  }
}
