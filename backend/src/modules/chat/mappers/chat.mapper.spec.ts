import { ChatMapper } from "./chat.mapper";

describe(ChatMapper.name, () => {
  it("maps conversation projections with nested participants and messages", () => {
    const now = new Date("2026-06-10T00:00:00.000Z");

    const result = ChatMapper.toConversationDto({
      id: "conversation-1",
      type: "direct",
      name: null,
      participants: [
        {
          userId: "user-1",
          username: "alice",
          role: "member",
          joinedAt: now,
        },
      ],
      lastMessage: {
        id: "message-1",
        conversationId: "conversation-1",
        senderUserId: "user-1",
        senderUsername: "alice",
        content: "Hello",
        attachments: { invalid: true },
        createdAt: now,
      },
      unreadCount: 3,
      createdAt: now,
      updatedAt: now,
    });

    expect(result.lastMessage).toEqual(
      expect.objectContaining({
        attachments: [],
        status: "sent",
        type: "text",
      }),
    );
    expect(result.participants).toEqual([
      expect.objectContaining({ userId: "user-1", username: "alice" }),
    ]);
    expect(result.unreadCount).toBe(3);
  });
});
