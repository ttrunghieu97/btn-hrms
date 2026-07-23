import { RegisterSessionUseCase } from "./register-session.usecase";

describe(RegisterSessionUseCase.name, () => {
  it("registers employee for a published session", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "sess-1", status: "published" }),
      insertAttendee: jest.fn().mockResolvedValue({}),
    };
    const useCase = new RegisterSessionUseCase(repo as any);
    await useCase.execute("sess-1", "emp-1");

    expect(repo.insertAttendee).toHaveBeenCalledWith({
      sessionId: "sess-1", employeeId: "emp-1", status: "registered",
    });
  });

  it("rejects registration for non-published session", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "sess-1", status: "draft" }),
    };
    const useCase = new RegisterSessionUseCase(repo as any);
    await expect(useCase.execute("sess-1", "emp-1")).rejects.toThrow("Session must be published");
  });
});
