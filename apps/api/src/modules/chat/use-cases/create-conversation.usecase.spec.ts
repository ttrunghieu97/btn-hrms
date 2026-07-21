import { BadRequestException } from "@nestjs/common";
import { CreateConversationUseCase } from "./create-conversation.usecase";

describe("CreateConversationUseCase", () => {
  const mockUser = { id: "user-1", username: "tester" };
  const mockRepo = () => ({
    findOrCreateDirect: jest.fn(),
    getParticipantsWithUser: jest.fn().mockResolvedValue([]),
    getUnreadCount: jest.fn().mockResolvedValue(0),
    createConversation: jest.fn(),
    addParticipants: jest.fn(),
    transaction: jest.fn(async (cb: any) => cb()),
  });

  it("throws direct conversation without exactly 1 participant", async () => {
    const repo = mockRepo();
    const ctx = { get: () => ({ requestId: "r" }) };
    const uc = new CreateConversationUseCase(repo as any, ctx as any);
    await expect(uc.execute({ type: "direct", participantUserIds: [] } as any, mockUser as any))
      .rejects.toThrow(BadRequestException);
  });

  it("creates direct conversation", async () => {
    const repo = mockRepo();
    repo.findOrCreateDirect.mockResolvedValue({ id: "conv-1" });
    const ctx = { get: () => ({ requestId: "r" }) };
    const uc = new CreateConversationUseCase(repo as any, ctx as any);
    const result = await uc.execute({ type: "direct", participantUserIds: ["user-2"] } as any, mockUser as any);
    expect(repo.findOrCreateDirect).toHaveBeenCalledWith("user-1", "user-2");
    expect(result).toBeDefined();
  });

  it("creates group conversation", async () => {
    const repo = mockRepo();
    repo.createConversation.mockResolvedValue({ id: "conv-1" });
    const ctx = { get: () => ({ requestId: "r" }) };
    const uc = new CreateConversationUseCase(repo as any, ctx as any);
    const result = await uc.execute({ type: "group", name: "Team Chat", participantUserIds: ["user-2", "user-3"] } as any, mockUser as any);
    expect(repo.createConversation).toHaveBeenCalledWith({ type: "group", name: "Team Chat", createdByUserId: "user-1" });
    expect(repo.addParticipants).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
