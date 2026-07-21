import { IdempotencyService } from "./idempotency.service";
import type { IdempotencyRepository } from "./idempotency.repository";
import type { MetricsService } from "../../shared/metrics/metrics.service";

describe("IdempotencyService", () => {
  const makeService = () => {
    const repo = {
      insertPending: jest.fn(),
      findByKey: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as jest.Mocked<IdempotencyRepository>;
    const metrics = {
      incrementIdempotencyReplay: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;

    return {
      service: new IdempotencyService(repo, metrics),
      repo,
      metrics,
    };
  };

  it("disables idempotency when the request has no key", async () => {
    const { service, repo } = makeService();

    await expect(
      service.beginRequest({
        endpoint: "POST:/employees",
        payload: { name: "Employee" },
      }),
    ).resolves.toEqual({ mode: "disabled" });
    expect(repo.insertPending).not.toHaveBeenCalled();
  });

  it("returns a stored response and records the replay metric", () => {
    const { service, metrics } = makeService();
    const response = { id: "employee-1" };

    expect(service.replay(response)).toBe(response);
    expect(metrics.incrementIdempotencyReplay).toHaveBeenCalledTimes(1);
  });

  it("normalizes unknown failures before persistence", async () => {
    const { service, repo } = makeService();

    await service.failRequest("record-1", { message: 42 });

    expect(repo.markFailed).toHaveBeenCalledWith({
      id: "record-1",
      errorPayload: { name: "Error", message: "Unknown error" },
    });
  });
});
