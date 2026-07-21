import { GetReadinessUseCase } from "./get-readiness.usecase";

describe("GetReadinessUseCase", () => {
  const databaseHealth = { check: jest.fn() };
  const storage = { healthCheck: jest.fn() };
  const eventBus = { healthCheck: jest.fn() };

  const useCase = new GetReadinessUseCase(
    databaseHealth as never,
    storage as never,
    eventBus as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports ready when every dependency is healthy", async () => {
    databaseHealth.check.mockResolvedValue({ status: "up", latencyMs: 4 });
    storage.healthCheck.mockResolvedValue({ ok: true });
    eventBus.healthCheck.mockResolvedValue({ ok: true });

    await expect(useCase.execute()).resolves.toMatchObject({
      status: "ready",
      database: { ok: true, latencyMs: 4 },
      storage: { ok: true },
      eventBus: { ok: true },
    });
  });

  it("reports degraded when the database is unavailable", async () => {
    databaseHealth.check.mockResolvedValue({ status: "down", latencyMs: 1000 });
    storage.healthCheck.mockResolvedValue({ ok: true });
    eventBus.healthCheck.mockResolvedValue({ ok: true });

    await expect(useCase.execute()).resolves.toMatchObject({
      status: "degraded",
      database: { ok: false, latencyMs: 1000 },
    });
  });
});
