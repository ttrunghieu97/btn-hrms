import { SubmitResignationRequestUseCase } from "./submit-resignation-request.usecase";

describe("SubmitResignationRequestUseCase", () => {
  const employeesRepo = {
    findEmployeeByUserId: jest.fn(),
  };
  const scheduleTermination = {
    execute: jest.fn(),
  };
  const workflowEngine = {
    findActiveInstanceByKeyAndSubject: jest.fn(),
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ userId: "u-emp", traceId: "t-resign" }),
  };

  const useCase = new SubmitResignationRequestUseCase(
    employeesRepo as never,
    scheduleTermination as never,
    workflowEngine as never,
    requestContext as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 404 NotFound when caller has no linked employee profile", async () => {
    employeesRepo.findEmployeeByUserId.mockResolvedValue(null);

    await expect(
      useCase.execute("u-missing", {
        requestedLastWorkingDate: "2099-12-31",
        reason: "Personal reasons",
      }),
    ).rejects.toThrow(/Employee profile not found/i);
  });

  it("throws 400 BadRequest when requestedLastWorkingDate is in the past", async () => {
    employeesRepo.findEmployeeByUserId.mockResolvedValue({
      id: "emp-1",
      userId: "u-emp",
    });

    await expect(
      useCase.execute("u-emp", {
        requestedLastWorkingDate: "2000-01-01",
        reason: "Relocating",
      }),
    ).rejects.toThrow(/cannot be in the past/i);
  });

  it("throws 409 Conflict when an active resignation or scheduled termination workflow already exists", async () => {
    employeesRepo.findEmployeeByUserId.mockResolvedValue({
      id: "emp-1",
      userId: "u-emp",
    });
    workflowEngine.findActiveInstanceByKeyAndSubject.mockResolvedValue({
      id: "wf-existing",
    });

    await expect(
      useCase.execute("u-emp", {
        requestedLastWorkingDate: "2099-12-31",
        reason: "Career change",
      }),
    ).rejects.toThrow(/active resignation or scheduled termination already exists/i);
  });

  it("formats resignation reason and delegates to ScheduleTerminationUseCase", async () => {
    employeesRepo.findEmployeeByUserId.mockResolvedValue({
      id: "emp-1",
      userId: "u-emp",
    });
    workflowEngine.findActiveInstanceByKeyAndSubject.mockResolvedValue(null);
    scheduleTermination.execute.mockResolvedValue({
      success: true,
      workflowInstanceId: "wf-new-1",
      effectiveDate: "2099-12-31",
    });

    const res = await useCase.execute("u-emp", {
      requestedLastWorkingDate: "2099-12-31",
      reason: "  Chuyển nơi cư trú cùng gia đình  ",
    });

    expect(scheduleTermination.execute).toHaveBeenCalledWith("emp-1", {
      effectiveDate: "2099-12-31",
      lastWorkingDate: "2099-12-31",
      reason: "[Đơn xin thôi việc]: Chuyển nơi cư trú cùng gia đình",
    });
    expect(res).toEqual({
      success: true,
      workflowInstanceId: "wf-new-1",
      effectiveDate: "2099-12-31",
      requestedLastWorkingDate: "2099-12-31",
    });
  });
});
