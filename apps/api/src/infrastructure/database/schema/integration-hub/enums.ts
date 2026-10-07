import { pgEnum } from "drizzle-orm/pg-core";

export const webhookSubscriptionStatusEnum = pgEnum(
  "webhook_subscription_status_enum",
  ["active", "disabled"],
);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status_enum", [
  "pending",
  "processing",
  "delivered",
  "failed",
]);
