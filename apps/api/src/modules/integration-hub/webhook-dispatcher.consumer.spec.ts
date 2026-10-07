import { WebhookDispatcherConsumer } from "./webhook-dispatcher.consumer";
import type { IntegrationHubRepository } from "./integration-hub.repository";
import * as dns from "node:dns/promises";

jest.mock("node:dns/promises");

describe(WebhookDispatcherConsumer.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (dns.lookup as unknown as jest.Mock).mockResolvedValue([
      { address: "93.184.215.14", family: 4 },
    ]);
  });

  it("dispatches only claimed deliveries using redirect: 'manual'", async () => {
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
      expect.objectContaining({ method: "POST", redirect: "manual" }),
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

  it("blocks SSRF targets and permanently marks delivery as failed without retrying", async () => {
    (dns.lookup as unknown as jest.Mock).mockResolvedValue([
      { address: "169.254.169.254", family: 4 },
    ]);

    const repo = {
      claimPendingDeliveries: jest.fn().mockResolvedValue([
        {
          id: "delivery-ssrf",
          subscriptionId: "sub-ssrf",
          attemptCount: 0,
          requestHeaders: {},
          payload: { ok: true },
        },
      ]),
      getSubscriptionById: jest.fn().mockResolvedValue({
        id: "sub-ssrf",
        targetUrl: "https://evil-rebind.com/webhook",
      }),
      markDeliveryAttempt: jest.fn().mockResolvedValue(undefined),
    };

    const consumer = new WebhookDispatcherConsumer(repo as unknown as IntegrationHubRepository);
    const fetchSpy = jest.spyOn(global, "fetch");

    await consumer.dispatch();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(repo.markDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "delivery-ssrf",
        status: "failed",
        lastError: "ssrf_policy_violation",
        nextAttemptAt: null,
      }),
    );

    fetchSpy.mockRestore();
  });

  it("blocks HTTP redirect responses (302) to prevent redirection to internal resources", async () => {
    const repo = {
      claimPendingDeliveries: jest.fn().mockResolvedValue([
        {
          id: "delivery-redir",
          subscriptionId: "sub-redir",
          attemptCount: 0,
          requestHeaders: {},
          payload: { ok: true },
        },
      ]),
      getSubscriptionById: jest.fn().mockResolvedValue({
        id: "sub-redir",
        targetUrl: "https://example.com/webhook",
      }),
      markDeliveryAttempt: jest.fn().mockResolvedValue(undefined),
    };

    const consumer = new WebhookDispatcherConsumer(repo as unknown as IntegrationHubRepository);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 302 }));

    await consumer.dispatch();

    expect(repo.markDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "delivery-redir",
        status: "failed",
        lastError: "redirect_blocked_302",
        nextAttemptAt: null,
      }),
    );

    fetchSpy.mockRestore();
  });
});
