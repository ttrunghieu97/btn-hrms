import { pgEnum } from "drizzle-orm/pg-core";

export const chatConversationTypeEnum = pgEnum("chat_conversation_type_enum", [
  "direct",
  "group",
]);

export const chatParticipantRoleEnum = pgEnum("chat_participant_role_enum", [
  "owner",
  "admin",
  "member",
]);

export const chatMessageStatusEnum = pgEnum("chat_message_status_enum", [
  "sent",
  "delivered",
  "read",
]);

export const chatMessageTypeEnum = pgEnum("chat_message_type_enum", [
  "text",
  "attachment",
  "system",
]);
