import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  chatConversationTypeEnum,
  chatParticipantRoleEnum,
  chatMessageStatusEnum,
  chatMessageTypeEnum,
} from "./enums";
import { users } from "../identity/tables";

export const chatConversations = pgTable(
  "chat_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: chatConversationTypeEnum("type").notNull(),
    name: text("name"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxType: index("idx_chat_conversations_type").on(table.type),
    idxCreatedBy: index("idx_chat_conversations_created_by").on(
      table.createdByUserId,
    ),
    idxUpdatedAt: index("idx_chat_conversations_updated_at").on(table.updatedAt),
  }),
);

export const chatParticipants = pgTable(
  "chat_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: chatParticipantRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqConvUser: unique("uq_chat_participants_conv_user").on(
      table.conversationId,
      table.userId,
    ),
    idxConversation: index("idx_chat_participants_conversation").on(
      table.conversationId,
    ),
    idxUser: index("idx_chat_participants_user").on(table.userId),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    senderUserId: uuid("sender_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: chatMessageTypeEnum("type").notNull().default("text"),
    content: text("content"),
    attachments: jsonb("attachments").$type<
      { name: string; size: number; mimeType: string; url: string }[]
    >(),
    status: chatMessageStatusEnum("status").notNull().default("sent"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxConversation: index("idx_chat_messages_conversation").on(
      table.conversationId,
    ),
    idxConvCreated: index("idx_chat_messages_conv_created").on(
      table.conversationId,
      table.createdAt,
    ),
    idxSender: index("idx_chat_messages_sender").on(table.senderUserId),
    idxDeletedAt: index("idx_chat_messages_deleted_at").on(table.deletedAt),
  }),
);

export const chatMessageReads = pgTable(
  "chat_message_reads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadMessageId: uuid("last_read_message_id").references(
      () => chatMessages.id,
      { onDelete: "set null" },
    ),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uqConvUser: unique("uq_chat_message_reads_conv_user").on(
      table.conversationId,
      table.userId,
    ),
    idxConversation: index("idx_chat_message_reads_conversation").on(
      table.conversationId,
    ),
    idxUser: index("idx_chat_message_reads_user").on(table.userId),
  }),
);
