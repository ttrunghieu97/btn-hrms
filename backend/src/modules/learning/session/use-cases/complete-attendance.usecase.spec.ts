import { MarkCompletedUseCase } from "./complete-attendance.usecase";

describe(MarkCompletedUseCase.name, () => {
  it("marks attendee as completed", async () => {
    const repo = {
      findAttendee: jest.fn().mockResolvedValue({ id: "att-1", sessionId: "sess-1", employeeId: "emp-1", status: "checked-in" }),
      findById: jest.fn().mockResolvedValue({ id: "sess-1", courseId: "c1" }),
      updateAttendee: jest.fn().mockResolvedValue({}),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new MarkCompletedUseCase(repo as any, eventOutbox as any);
    await useCase.execute("sess-1", "emp-1");

    expect(repo.updateAttendee).toHaveBeenCalledWith("att-1", { status: "completed", completedAt: expect.any(Date) });
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.attendance.marked.v1" }),
    );
  });

  it("rejects mark-completed when not registered", async () => {
    const repo = { findAttendee: jest.fn().mockResolvedValue(null) };
    const useCase = new MarkCompletedUseCase(repo as any, {} as any);
    await expect(useCase.execute("sess-1", "emp-1")).rejects.toThrow("Not registered");
  });
});
