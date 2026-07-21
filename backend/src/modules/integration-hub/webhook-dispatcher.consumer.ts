import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IntegrationHubRepository, type WebhookDeliveryClaim } from "./integration-hub.repository";

function getDispatchError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "AbortError" ? "fetch_timeout" : error.message;
  }
  return "fetch_failed";
}

@Injectable()
export class WebhookDispatcherConsumer {
  private readonly logger = new Logger(WebhookDispatcherConsumer.name);

  constructor(private readonly repo: IntegrationHubRepository) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async dispatch() {
    const rows = await this.repo.claimPendingDeliveries(100);
    const batchSize = 10;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await Promise.allSettled(batch.map((row) => this.dispatchOne(row)));
    }
  }

  private async dispatchOne(row: WebhookDeliveryClaim) {
    const subscription = await this.repo.getSubscriptionById(row.subscriptionId);
    const timeoutMs = Math.max(Number(process.env.WEBHOOK_DELIVERY_TIMEOUT_MS || 10_000), 1000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    timeout.unref?.();

    try {
      if (!subscription) {
        await this.repo.markDeliveryAttempt({
          id: row.id,
          status: "failed",
          attemptCount: row.attemptCount + 1,
          lastError: "subscription_not_found",
        });
        return;
      }

      const attempt = row.attemptCount + 1;

      try {
        const res = await fetch(String(subscription.targetUrl), {
          method: "POST",
          headers: row.requestHeaders,
          body: JSON.stringify(row.payload),
          signal: controller.signal,
        });

        if (res.ok) {
          await this.repo.markDeliveryAttempt({
            id: row.id,
            status: "delivered",
            attemptCount: attempt,
            deliveredAt: new Date(),
          });
          return;
        }

        const text = await res.text().catch((error: unknown) => {
          this.logger.warn({
            event: "webhook.response_body_read_failed",
            deliveryId: row.id,
            reason: getDispatchError(error),
          });
          return "";
        });
        const isRetryable = res.status >= 500 || res.status === 429;
        const backoffMs = Math.min(60_000, 1000 * Math.pow(2, attempt - 1));

        await this.repo.markDeliveryAttempt({
          id: row.id,
          status: isRetryable ? "pending" : "failed",
          attemptCount: attempt,
          lastError: `http_${res.status}:${text.slice(0, 500)}`,
          nextAttemptAt: isRetryable ? new Date(Date.now() + backoffMs) : null,
        });
      } catch (error: unknown) {
        const backoffMs = Math.min(60_000, 1000 * Math.pow(2, attempt - 1));
        const reason = getDispatchError(error);
        await this.repo.markDeliveryAttempt({
          id: row.id,
          status: attempt >= 5 ? "failed" : "pending",
          attemptCount: attempt,
          lastError: reason,
          nextAttemptAt: attempt >= 5 ? null : new Date(Date.now() + backoffMs),
        });
        this.logger.warn({
          event: "webhook.dispatch_failed",
          deliveryId: row.id,
          reason,
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
