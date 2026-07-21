import { relations } from "drizzle-orm";
import { webhookSubscriptions, webhookDeliveries } from "./tables";

export const webhookSubscriptionsRelations = relations(
  webhookSubscriptions,
  ({ many }) => ({
    deliveries: many(webhookDeliveries),
  }),
);

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    subscription: one(webhookSubscriptions, {
      fields: [webhookDeliveries.subscriptionId],
      references: [webhookSubscriptions.id],
    }),
  }),
);
