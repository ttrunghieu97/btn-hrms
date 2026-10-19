import { ExplainAttendanceExceptionUseCase } from "./explain-attendance-exception.usecase";

describe("ExplainAttendanceExceptionUseCase", () => {
  const repo = {
    getExceptionById: jest.fn(),
    updateExceptionNote: jest.fn(),
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ traceId: "t-1", userId: "u-1" }),
  };
  const queryScope = {
    resolveScope: jest.fn(),
  };

  const useCase = new ExplainAttendanceExceptionUseCase(
    repo as never,
    requestContext as never,
    queryScope as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 404 NotFound when attendance exception does not exist", async () => {
    repo.getExceptionById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        "exc-404",
        { id: "u-1", employeeId: "emp-1", permissions: ["attendance:view:self"] } as never,
        { note: "Traffic jam due to heavy rain" },
      ),
    ).rejects.toThrow(/Attendance exception not found/i);
  });

  it("throws 403 Forbidden when self-scoped employee tries to explain another employee's exception", async () => {
    repo.getExceptionById.mockResolvedValue({
      id: "exc-1",
      employeeId: "emp-other",
      status: "pending",
    });
    queryScope.resolveScope.mockReturnValue({ tier: "self" });

    await expect(
      useCase.execute(
        "exc-1",
        { id: "u-1", employeeId: "emp-self", permissions: ["attendance:view:self"] } as never,
        { note: "Forgot badge" },
      ),
    ).rejects.toThrow(/only explain your own attendance exceptions/i);

    expect(repo.updateExceptionNote).not.toHaveBeenCalled();
  });

  it("throws 400 BadRequest when attendance exception is not pending", async () => {
    repo.getExceptionById.mockResolvedValue({
      id: "exc-resolved",
      employeeId: "emp-self",
      status: "resolved",
    });
    queryScope.resolveScope.mockReturnValue({ tier: "self" });

    await expect(
      useCase.execute(
        "exc-resolved",
        { id: "u-1", employeeId: "emp-self", permissions: ["attendance:view:self"] } as never,
        { note: "Already resolved" },
      ),
    ).rejects.toThrow(/Only pending attendance exceptions can be explained/i);
  });

  it("formats and saves the employee explanation note for a pending exception", async () => {
    repo.getExceptionById.mockResolvedValue({
      id: "exc-1",
      employeeId: "emp-self",
      status: "pending",
    });
    queryScope.resolveScope.mockReturnValue({ tier: "self" });
    repo.updateExceptionNote.mockResolvedValue({
      id: "exc-1",
      employeeId: "emp-self",
      status: "pending",
      resolutionNote: "[Giải trình NV]: Đi gặp khách hàng buổi sáng",
    });

    const res = await useCase.execute(
      "exc-1",
      { id: "u-1", employeeId: "emp-self", permissions: ["attendance:view:self"] } as never,
      { note: "  Đi gặp khách hàng buổi sáng  " },
    );

    expect(repo.updateExceptionNote).toHaveBeenCalledWith(
      "exc-1",
      "[Giải trình NV]: Đi gặp khách hàng buổi sáng",
    );
    expect(res.exception?.resolutionNote).toBe("[Giải trình NV]: Đi gặp khách hàng buổi sáng");
  });
});
