import { relations } from "drizzle-orm";
import {
  chatConversations,
  chatParticipants,
  chatMessages,
  chatMessageReads,
} from "./tables";
import { users } from "../identity/tables";

export const chatConversationsRelations = relations(
  chatConversations,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [chatConversations.createdByUserId],
      references: [users.id],
    }),
    participants: many(chatParticipants),
    messages: many(chatMessages),
    messageReads: many(chatMessageReads),
  }),
);

export const chatParticipantsRelations = relations(
  chatParticipants,
  ({ one }) => ({
    conversation: one(chatConversations, {
      fields: [chatParticipants.conversationId],
      references: [chatConversations.id],
    }),
    user: one(users, {
      fields: [chatParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderUserId],
    references: [users.id],
  }),
}));

export const chatMessageReadsRelations = relations(
  chatMessageReads,
  ({ one }) => ({
    conversation: one(chatConversations, {
      fields: [chatMessageReads.conversationId],
      references: [chatConversations.id],
    }),
    user: one(users, {
      fields: [chatMessageReads.userId],
      references: [users.id],
    }),
    lastReadMessage: one(chatMessages, {
      fields: [chatMessageReads.lastReadMessageId],
      references: [chatMessages.id],
    }),
  }),
);
