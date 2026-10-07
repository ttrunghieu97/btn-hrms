import { TerminateEmployeeUseCase } from "./terminate-employee.usecase";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

const buildUseCase = (overrides: {
  employeeRepo?: any;
  contractRepo?: any;
  eventOutbox?: any;
  requestContext?: any;
} = {}) => {
  const employeeId = "e1";
  const userId = "u1";
  const tx = { marker: true };
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const futureStr = new Date(today.getTime() + 86_400_000)
    .toISOString()
    .split("T")[0];
  const employeeRepo = {
    findById: jest.fn().mockResolvedValue({
      id: employeeId,
      userId,
      status: "working",
      endDate: null,
    }),
    transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
    updateEmployeeById: jest.fn().mockResolvedValue({ id: employeeId }),
    ...overrides.employeeRepo,
  };
  const contractRepo = {
    getCurrent: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides.contractRepo,
  };
  const eventOutbox = {
    stage: jest.fn().mockResolvedValue(undefined),
    ...overrides.eventOutbox,
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ requestId: "req-1" }),
    ...overrides.requestContext,
  };

  const lifecycle = {
    executeImmediateTermination: jest.fn().mockResolvedValue(undefined),
  } as any;

  const useCase = new TerminateEmployeeUseCase(
    employeeRepo,
    contractRepo,
    lifecycle,
    eventOutbox,
    requestContext,
  );

  return { useCase, employeeRepo, contractRepo, lifecycle, eventOutbox, tx, employeeId, userId, todayStr, futureStr };
};

describe(TerminateEmployeeUseCase.name, () => {
  it("sets endDate, deactivates user, and stages terminated event", async () => {
    const { useCase, lifecycle, contractRepo, eventOutbox, tx, employeeId, userId, futureStr } =
      buildUseCase({
        contractRepo: {
          getCurrent: jest.fn().mockResolvedValue({ id: "c1" }),
          update: jest.fn().mockResolvedValue(undefined),
        },
      });

    await useCase.execute(employeeId, { reason: "end_date", effectiveDate: "2099-12-31", lastWorkingDate: "2099-12-31" });

    expect(lifecycle.executeImmediateTermination).toHaveBeenCalledWith(
      employeeId,
      { reason: "end_date", effectiveDate: "2099-12-31", lastWorkingDate: "2099-12-31" },
      null,
      tx,
    );
    expect(contractRepo.update).toHaveBeenCalledWith(
      "c1",
      { isCurrent: false, status: "terminated", effectiveTo: "2099-12-31" },
      tx,
    );
    expect(eventOutbox.stage).toHaveBeenCalledTimes(1);
  });

  it("rejects when employee is already terminated (endDate in the past)", async () => {
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .split("T")[0];
    const { useCase, employeeRepo } = buildUseCase({
      employeeRepo: {
        findById: jest.fn().mockResolvedValue({
          id: "e1",
          userId: "u1",
          status: "working",
          endDate: yesterday,
        }),
      },
    });

    const err = await useCase.execute("e1", { reason: "test", effectiveDate: "2099-12-31" }).catch((e) => e);
    expect(err).toBeDefined();
    expect(err.getResponse()).toMatchObject({
      error: ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
    });
    expect(employeeRepo.updateEmployeeById).not.toHaveBeenCalled();
  });

  it("rejects when employee is already terminated (status flag)", async () => {
    const { useCase, employeeRepo } = buildUseCase({
      employeeRepo: {
        findById: jest.fn().mockResolvedValue({
          id: "e1",
          userId: "u1",
          status: "terminated",
          endDate: null,
        }),
      },
    });

    const err = await useCase.execute("e1", { reason: "test", effectiveDate: "2099-12-31" }).catch((e) => e);
    expect(err).toBeDefined();
    expect(err.getResponse()).toMatchObject({
      error: ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
    });
    expect(employeeRepo.updateEmployeeById).not.toHaveBeenCalled();
  });

  it("throws 404 when employee not found", async () => {
    const { useCase } = buildUseCase({
      employeeRepo: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    const err = await useCase.execute("missing", { reason: "", effectiveDate: "2099-12-31" }).catch((e) => e);
    expect(err).toBeDefined();
    expect(err.getResponse()).toMatchObject({
      error: ERROR_CODES.EMPLOYEE_NOT_FOUND,
    });
  });

  it("uses provided terminationDate when supplied", async () => {
    const { useCase, lifecycle, tx, employeeId } = buildUseCase();
    const custom = new Date("2025-06-15T00:00:00Z");
    const customStr = custom.toISOString().split("T")[0];

    await useCase.execute(employeeId, { reason: "custom", effectiveDate: customStr!, lastWorkingDate: customStr! });

    expect(lifecycle.executeImmediateTermination).toHaveBeenCalledWith(
      employeeId,
      { reason: "custom", effectiveDate: customStr, lastWorkingDate: customStr },
      null,
      tx,
    );
  });
});
