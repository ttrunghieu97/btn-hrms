import { RedisService } from "./redis.service";

describe("RedisService", () => {
  it("exposes an explicit disabled state when Redis is not configured", async () => {
    const service = new RedisService(null);

    expect(service.getClientOrNull()).toBeNull();
    expect(() => service.getClient()).toThrow("Redis is not configured");
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
