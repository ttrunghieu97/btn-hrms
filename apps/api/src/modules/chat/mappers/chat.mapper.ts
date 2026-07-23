interface ChatParticipantRow {
  userId: string;
  username?: string | null;
  role: string;
  joinedAt: Date;
}

interface ChatMessageRow {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  senderUsername?: string | null;
  type?: string | null;
  content: string | null;
  attachments?: unknown;
  status?: string | null;
  createdAt: Date;
}

interface ChatConversationRow {
  id: string;
  type: string;
  name?: string | null;
  participants?: ChatParticipantRow[];
  lastMessage?: ChatMessageRow | null;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ChatMapper {
  static toConversationDto(row: ChatConversationRow) {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      participants: (row.participants ?? []).map(ChatMapper.toParticipantDto),
      lastMessage: row.lastMessage
        ? ChatMapper.toMessageDto(row.lastMessage)
        : null,
      unreadCount: row.unreadCount ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toMessageDto(row: ChatMessageRow) {
    return {
      id: row.id,
      conversationId: row.conversationId,
      sender: {
        userId: row.senderUserId,
        username: row.senderUsername ?? null,
      },
      type: row.type ?? "text",
      content: row.content,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      status: row.status ?? "sent",
      createdAt: row.createdAt,
    };
  }

  static toParticipantDto(row: ChatParticipantRow) {
    return {
      userId: row.userId,
      username: row.username ?? null,
      role: row.role,
      joinedAt: row.joinedAt,
    };
  }

}

