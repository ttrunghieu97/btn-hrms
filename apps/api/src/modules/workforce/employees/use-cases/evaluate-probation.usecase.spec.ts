import { EvaluateProbationUseCase } from "./evaluate-probation.usecase";

describe("EvaluateProbationUseCase", () => {
  const employeesRepo = {
    findByIdentifier: jest.fn(),
    transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({})),
    updateEmployeeById: jest.fn(),
    insertStatusHistory: jest.fn(),
  };
  const lifecycle = {
    changeStatus: jest.fn(),
  };
  const scheduleTermination = {
    execute: jest.fn(),
  };
  const terminateEmployee = {
    execute: jest.fn(),
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ userId: "u-hr", traceId: "t-1" }),
  };

  const useCase = new EvaluateProbationUseCase(
    employeesRepo as never,
    lifecycle as never,
    scheduleTermination as never,
    terminateEmployee as never,
    requestContext as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    requestContext.get.mockReturnValue({ userId: "u-hr", traceId: "t-1" });
    employeesRepo.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    );
  });

  it("throws 404 NotFound when employee does not exist", async () => {
    employeesRepo.findByIdentifier.mockResolvedValue(null);

    await expect(
      useCase.execute("emp-404", { decision: "confirm" }),
    ).rejects.toThrow(/Employee not found/i);
  });

  it("throws 400 BadRequest when employee is not currently in probation", async () => {
    employeesRepo.findByIdentifier.mockResolvedValue({
      id: "emp-1",
      status: "working",
      deletedAt: null,
    });

    await expect(
      useCase.execute("emp-1", { decision: "confirm" }),
    ).rejects.toThrow(/currently in probation/i);
  });

  it("confirms probation and transitions employee status to working", async () => {
    employeesRepo.findByIdentifier.mockResolvedValue({
      id: "emp-prob",
      status: "probation",
      probationEndDate: "2026-10-31",
      deletedAt: null,
    });

    const res = await useCase.execute("emp-prob", {
      decision: "confirm",
      effectiveDate: "2026-10-20",
      notes: "Completed all onboarding KPIs",
    });

    expect(lifecycle.changeStatus).toHaveBeenCalledWith("emp-prob", {
      status: "working",
      effectiveDate: "2026-10-20",
      reason: "Completed all onboarding KPIs",
    });
    expect(res).toEqual({
      success: true,
      decision: "confirm",
      status: "working",
      effectiveDate: "2026-10-20",
    });
  });

  it("validates newProbationEndDate when extending probation and updates employee + status history", async () => {
    employeesRepo.findByIdentifier.mockResolvedValue({
      id: "emp-prob",
      status: "probation",
      probationEndDate: "2026-10-31",
      deletedAt: null,
    });

    await expect(
      useCase.execute("emp-prob", { decision: "extend" }),
    ).rejects.toThrow(/newProbationEndDate is required/i);

    await expect(
      useCase.execute("emp-prob", {
        decision: "extend",
        newProbationEndDate: "2026-10-15",
      }),
    ).rejects.toThrow(/must be after current probation end date/i);

    const res = await useCase.execute("emp-prob", {
      decision: "extend",
      newProbationEndDate: "2026-11-30",
      notes: "Extend 1 month for project evaluation",
    });

    expect(employeesRepo.updateEmployeeById).toHaveBeenCalledWith(
      "emp-prob",
      expect.objectContaining({
        probationEndDate: "2026-11-30",
        endDate: "2026-11-30",
      }),
      expect.anything(),
    );
    expect(employeesRepo.insertStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-prob",
        status: "probation",
        notes: "Extend 1 month for project evaluation",
        changedBy: "u-hr",
      }),
      expect.anything(),
    );
    expect(res).toEqual({
      success: true,
      decision: "extend",
      status: "probation",
      probationEndDate: "2026-11-30",
    });
  });

  it("terminates immediately or schedules future termination when decision is fail", async () => {
    employeesRepo.findByIdentifier.mockResolvedValue({
      id: "emp-prob",
      status: "probation",
      probationEndDate: "2026-10-31",
      deletedAt: null,
    });

    const immediateRes = await useCase.execute("emp-prob", {
      decision: "fail",
      effectiveDate: "2000-01-01",
      notes: "Did not meet probation standards",
    });

    expect(terminateEmployee.execute).toHaveBeenCalledWith("emp-prob", {
      effectiveDate: "2000-01-01",
      reason: "Did not meet probation standards",
      lastWorkingDate: "2000-01-01",
    });
    expect(immediateRes.status).toBe("terminated");

    const futureRes = await useCase.execute("emp-prob", {
      decision: "fail",
      effectiveDate: "2099-12-31",
      notes: "Scheduled end of probation",
    });

    expect(scheduleTermination.execute).toHaveBeenCalledWith("emp-prob", {
      effectiveDate: "2099-12-31",
      reason: "Scheduled end of probation",
      lastWorkingDate: "2099-12-31",
    });
    expect(futureRes.status).toBe("probation");
  });
});
