import { WithdrawSessionUseCase } from "./withdraw-session.usecase";

describe(WithdrawSessionUseCase.name, () => {
  it("withdraws a registered attendee", async () => {
    const repo = {
      findAttendee: jest.fn().mockResolvedValue({ id: "att-1", sessionId: "sess-1", employeeId: "emp-1", status: "registered" }),
      updateAttendee: jest.fn().mockResolvedValue({}),
    };
    const useCase = new WithdrawSessionUseCase(repo as any);
    await useCase.execute("sess-1", "emp-1");

    expect(repo.updateAttendee).toHaveBeenCalledWith("att-1", { status: "withdrawn" });
  });

  it("rejects withdraw when not registered", async () => {
    const repo = { findAttendee: jest.fn().mockResolvedValue(null) };
    const useCase = new WithdrawSessionUseCase(repo as any);
    await expect(useCase.execute("sess-1", "emp-1")).rejects.toThrow("Not registered");
  });

  it("rejects withdraw of non-registered status", async () => {
    const repo = {
      findAttendee: jest.fn().mockResolvedValue({ id: "att-1", status: "completed" }),
    };
    const useCase = new WithdrawSessionUseCase(repo as any);
    await expect(useCase.execute("sess-1", "emp-1")).rejects.toThrow("Can only withdraw registered attendees");
  });
});
