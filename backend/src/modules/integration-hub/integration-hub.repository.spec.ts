import { IntegrationHubRepository } from "./integration-hub.repository";
import type { AppDatabase } from "../../infrastructure/database/database-client.type";

describe(IntegrationHubRepository.name, () => {
  it("claims pending deliveries through the atomic claim query", async () => {
    const db = {
      execute: jest.fn().mockResolvedValue({
        rows: [
          {
            id: "delivery-1",
            subscription_id: "subscription-1",
            attempt_count: 0,
            request_headers: { "x-event-id": "event-1" },
            payload: { ok: true },
          },
        ],
      }),
    };

    const repo = new IntegrationHubRepository(db as unknown as AppDatabase);
    const rows = await repo.claimPendingDeliveries(25);

    expect(db.execute).toHaveBeenCalled();
    expect(rows).toEqual([
      {
        id: "delivery-1",
        subscriptionId: "subscription-1",
        attemptCount: 0,
        requestHeaders: { "x-event-id": "event-1" },
        payload: { ok: true },
      },
    ]);
  });

  it("does not write null into non-null retry timestamps", async () => {
    const where = jest.fn();
    const set = jest.fn().mockReturnValue({ where });
    const db = {
      update: jest.fn().mockReturnValue({ set }),
    };
    const repo = new IntegrationHubRepository(
      db as unknown as AppDatabase,
    );

    await repo.markDeliveryAttempt({
      id: "delivery-1",
      status: "failed",
      attemptCount: 5,
      nextAttemptAt: null,
      deliveredAt: null,
    });

    const [values] = set.mock.calls[0] as [Record<string, unknown>];
    expect(values).not.toHaveProperty("nextAttemptAt");
    expect(values).not.toHaveProperty("deliveredAt");
  });
});
