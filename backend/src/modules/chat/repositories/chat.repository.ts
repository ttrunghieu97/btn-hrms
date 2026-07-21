import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../infrastructure/database/database-client.type";
import {
  chatConversations,
  chatParticipants,
  chatMessages,
  chatMessageReads,
  users,
} from "../../../infrastructure/database/schema";
import * as schema from "../../../infrastructure/database/schema";
import { and, desc, eq, lt, sql, isNull, inArray, aliasedTable } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type Db = PostgresJsDatabase<typeof schema>;

@Injectable()
export class ChatRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async findConversationsForUser(userId: string) {
    const participantRows = await this.db
      .select({ conversationId: chatParticipants.conversationId })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    const conversationIds = participantRows.map((r) => r.conversationId);
    if (conversationIds.length === 0) return [];

    const conversations = await this.db
      .select()
      .from(chatConversations)
      .where(inArray(chatConversations.id, conversationIds))
      .orderBy(desc(chatConversations.updatedAt));

    // 1. Batch fetch participants with users
    const allParticipants = await this.db
      .select({
        conversationId: chatParticipants.conversationId,
        userId: chatParticipants.userId,
        role: chatParticipants.role,
        joinedAt: chatParticipants.joinedAt,
        username: users.username,
      })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(inArray(chatParticipants.conversationId, conversationIds));

    // 2. Batch fetch last messages using window function
    const lastMessagesSq = this.db
      .select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        content: chatMessages.content,
        senderUserId: chatMessages.senderUserId,
        createdAt: chatMessages.createdAt,
        rowNumber: sql<number>`row_number() over (partition by ${chatMessages.conversationId} order by ${chatMessages.createdAt} desc)`.as("rn"),
      })
      .from(chatMessages)
      .where(and(inArray(chatMessages.conversationId, conversationIds), isNull(chatMessages.deletedAt)))
      .as("msg_sq");

    const lastMessages = await this.db
      .select({
        id: lastMessagesSq.id,
        conversationId: lastMessagesSq.conversationId,
        content: lastMessagesSq.content,
        senderUserId: lastMessagesSq.senderUserId,
        createdAt: lastMessagesSq.createdAt,
        senderUsername: users.username,
      })
      .from(lastMessagesSq)
      .leftJoin(users, eq(lastMessagesSq.senderUserId, users.id))
      .where(eq(lastMessagesSq.rowNumber, 1));

    // 3. Batch unread counts
    const _readReceipts = await this.db
      .select({
        conversationId: chatMessageReads.conversationId,
        lastReadCreatedAt: chatMessages.createdAt,
      })
      .from(chatMessageReads)
      .leftJoin(chatMessages, eq(chatMessageReads.lastReadMessageId, chatMessages.id))
      .where(and(inArray(chatMessageReads.conversationId, conversationIds), eq(chatMessageReads.userId, userId)));

    const participantsMap = new Map<
      string,
      (typeof allParticipants)[number][]
    >();
    allParticipants.forEach(p => {
      const list = participantsMap.get(p.conversationId) ?? [];
      list.push(p);
      participantsMap.set(p.conversationId, list);
    });

    const lastMsgMap = new Map(lastMessages.map(m => [m.conversationId, m]));

    // Single batch query for unread counts (replaces N+1 per-conversation getUnreadCount calls)
    const unreadRows: { conversation_id: string; count: number }[] = conversationIds.length > 0
      ? await this.db.execute(sql<{ conversation_id: string; count: number }>`
        SELECT cm.conversation_id, COUNT(*)::int AS count
        FROM chat_messages cm
        LEFT JOIN chat_message_reads cmr
          ON cmr.conversation_id = cm.conversation_id AND cmr.user_id = ${userId}
        LEFT JOIN chat_messages lrm ON lrm.id = cmr.last_read_message_id
        WHERE cm.conversation_id IN (${sql.join(conversationIds.map(id => sql`${id}`), sql`, `)})
          AND cm.deleted_at IS NULL
          AND (cmr.last_read_message_id IS NULL OR cm.created_at > lrm.created_at)
        GROUP BY cm.conversation_id
      `)
      : [];

    const unreadCountMap = new Map(unreadRows.map(r => [r.conversation_id, r.count]));

    const result = [];
    for (const conv of conversations) {
      const participants = participantsMap.get(conv.id) ?? [];
      const lastMessage = lastMsgMap.get(conv.id) ?? null;
      const unreadCount = unreadCountMap.get(conv.id) ?? 0;

      result.push({ ...conv, participants, lastMessage, unreadCount });
    }
    return result;
  }

  async findConversationIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ conversationId: chatParticipants.conversationId })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));
    return rows.map((r) => r.conversationId);
  }

  async findParticipant(conversationId: string, userId: string) {
    const [row] = await this.db
      .select()
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          eq(chatParticipants.userId, userId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getParticipantsWithUser(conversationId: string) {
    return this.db
      .select({
        userId: chatParticipants.userId,
        role: chatParticipants.role,
        joinedAt: chatParticipants.joinedAt,
        username: users.username,
      })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(eq(chatParticipants.conversationId, conversationId));
  }

  async createConversation(data: {
    type: "direct" | "group";
    name?: string;
    createdByUserId: string;
  }) {
    const [row] = await this.db
      .insert(chatConversations)
      .values(data)
      .returning();
    return row;
  }

  async addParticipants(
    conversationId: string,
    entries: { userId: string; role?: "owner" | "admin" | "member" }[],
  ) {
    if (entries.length === 0) return;
    await this.db.insert(chatParticipants).values(
      entries.map((e) => ({
        conversationId,
        userId: e.userId,
        role: e.role ?? ("member" as const),
      })),
    );
  }

  async findOrCreateDirect(userIdA: string, userIdB: string) {
    const p1 = aliasedTable(chatParticipants, "p1");
    const p2 = aliasedTable(chatParticipants, "p2");

    const [existing] = await this.db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .innerJoin(p1, eq(chatConversations.id, p1.conversationId))
      .innerJoin(p2, eq(chatConversations.id, p2.conversationId))
      .where(
        and(
          eq(chatConversations.type, "direct"),
          eq(p1.userId, userIdA),
          eq(p2.userId, userIdB),
        ),
      )
      .limit(1);

    if (existing) {
      const [conv] = await this.db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, existing.id))
        .limit(1);
      return conv!;
    }

    return this.db.transaction(async (tx) => {
      const [newConv] = await tx
        .insert(chatConversations)
        .values({ type: "direct", createdByUserId: userIdA })
        .returning();

      await tx.insert(chatParticipants).values([
        { conversationId: newConv!.id, userId: userIdA, role: "member" as const },
        { conversationId: newConv!.id, userId: userIdB, role: "member" as const },
      ]);

      return newConv!;
    });
  }

  async createMessage(
    data: {
      conversationId: string;
      senderUserId: string;
      content: string;
      type?: "text" | "attachment" | "system";
      attachments?: {
        name: string;
        size: number;
        mimeType: string;
        url: string;
      }[];
    },
    tx?: Db,
  ) {
    const db = tx ?? this.db;
    const [row] = await db.insert(chatMessages).values(data).returning();

    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, data.conversationId));

    if (!row) {
      throw new Error("failed_to_create_chat_message");
    }
    return row;
  }

  async findMessages(
    conversationId: string,
    options: { before?: string; limit?: number },
  ) {
    const limit = options.limit ?? 30;
    const conditions = [
      eq(chatMessages.conversationId, conversationId),
      isNull(chatMessages.deletedAt),
    ];

    if (options.before) {
      conditions.push(lt(chatMessages.createdAt, new Date(options.before)));
    }

    const messages = await this.db
      .select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        senderUserId: chatMessages.senderUserId,
        type: chatMessages.type,
        content: chatMessages.content,
        attachments: chatMessages.attachments,
        status: chatMessages.status,
        createdAt: chatMessages.createdAt,
        updatedAt: chatMessages.updatedAt,
        senderUsername: users.username,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderUserId, users.id))
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    return messages.reverse();
  }

  async upsertReadReceipt(
    conversationId: string,
    userId: string,
    messageId: string,
  ) {
    await this.db
      .insert(chatMessageReads)
      .values({
        conversationId,
        userId,
        lastReadMessageId: messageId,
        readAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [chatMessageReads.conversationId, chatMessageReads.userId],
        set: { lastReadMessageId: messageId, readAt: new Date() },
      });
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const [readRow] = await this.db
      .select({ lastReadMessageId: chatMessageReads.lastReadMessageId })
      .from(chatMessageReads)
      .where(
        and(
          eq(chatMessageReads.conversationId, conversationId),
          eq(chatMessageReads.userId, userId),
        ),
      )
      .limit(1);

    if (!readRow?.lastReadMessageId) {
      const [countRow] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.conversationId, conversationId),
            isNull(chatMessages.deletedAt),
          ),
        );
      return countRow?.count ?? 0;
    }

    const [lastReadMsg] = await this.db
      .select({ createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.id, readRow.lastReadMessageId))
      .limit(1);

    if (!lastReadMsg) return 0;

    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          isNull(chatMessages.deletedAt),
          sql`${chatMessages.createdAt} > ${lastReadMsg.createdAt}`,
        ),
      );

    return countRow?.count ?? 0;
  }

  private async getLastMessage(conversationId: string) {
    const [msg] = await this.db
      .select({
        id: chatMessages.id,
        content: chatMessages.content,
        senderUserId: chatMessages.senderUserId,
        createdAt: chatMessages.createdAt,
        senderUsername: users.username,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderUserId, users.id))
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          isNull(chatMessages.deletedAt),
        ),
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);
    return msg ?? null;
  }

  async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}



