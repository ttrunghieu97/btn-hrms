import { WebhookDispatcherConsumer } from "./webhook-dispatcher.consumer";
import type { IntegrationHubRepository } from "./integration-hub.repository";

describe(WebhookDispatcherConsumer.name, () => {
  it("dispatches only claimed deliveries", async () => {
    const repo = {
      claimPendingDeliveries: jest.fn().mockResolvedValue([
        {
          id: "delivery-1",
          subscriptionId: "sub-1",
          attemptCount: 0,
          requestHeaders: {},
          payload: { ok: true },
        },
      ]),
      getSubscriptionById: jest.fn().mockResolvedValue({
        id: "sub-1",
        targetUrl: "https://example.com/webhook",
      }),
      markDeliveryAttempt: jest.fn().mockResolvedValue(undefined),
    };

    const consumer = new WebhookDispatcherConsumer(repo as unknown as IntegrationHubRepository);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await consumer.dispatch();

    expect(repo.claimPendingDeliveries).toHaveBeenCalledWith(100);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/webhook",
      expect.objectContaining({ method: "POST" }),
    );
    expect(repo.markDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "delivery-1",
        status: "delivered",
        attemptCount: 1,
      }),
    );

    fetchSpy.mockRestore();
  });
});
