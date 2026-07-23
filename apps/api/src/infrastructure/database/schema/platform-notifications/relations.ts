import { relations } from "drizzle-orm";
import {
  notifications,
  notificationTemplates,
  notificationPreferences,
} from "./tables";
import { users } from "../identity/tables";

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  template: one(notificationTemplates, {
    fields: [notifications.templateId],
    references: [notificationTemplates.id],
  }),
}));

export const notificationTemplatesRelations = relations(
  notificationTemplates,
  ({ many }) => ({
    notifications: many(notifications),
  }),
);

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  }),
);
