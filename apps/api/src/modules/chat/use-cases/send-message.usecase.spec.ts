import { ForbiddenException } from "@nestjs/common";
import { SendMessageUseCase } from "./send-message.usecase";

describe("SendMessageUseCase", () => {
  const mockUser = { id: "user-1", username: "tester", employeeId: "emp-1" };

  it("throws when not a participant", async () => {
    const repo = { findParticipant: jest.fn().mockResolvedValue(null), createMessage: jest.fn() };
    const ctx = { get: () => ({ requestId: "r" }) };
    const uc = new SendMessageUseCase(repo as any, ctx as any);
    await expect(uc.execute("conv-1", { content: "hello" } as any, mockUser as any))
      .rejects.toThrow(ForbiddenException);
  });

  it("creates message when participant", async () => {
    const repo = {
      findParticipant: jest.fn().mockResolvedValue({ userId: "user-1" }),
      createMessage: jest.fn().mockResolvedValue({ id: "msg-1", content: "hello", conversationId: "conv-1", senderUserId: "user-1", type: "text", createdAt: new Date(), updatedAt: new Date() }),
    };
    const ctx = { get: () => ({ requestId: "r" }) };
    const uc = new SendMessageUseCase(repo as any, ctx as any);
    const result = await uc.execute("conv-1", { content: "hello" } as any, mockUser as any);
    expect(repo.createMessage).toHaveBeenCalledWith({
      conversationId: "conv-1", senderUserId: "user-1", content: "hello", type: "text",
    });
    expect(result.content).toBe("hello");
  });
});
