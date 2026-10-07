import { RestoreEmployeeUseCase } from "./restore-employee.usecase";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

const buildUseCase = (overrides: {
  employeesRepo?: any;
  storage?: any;
  requestContext?: any;
  identityAdmin?: any;
} = {}) => {
  const tx = { marker: true };
  const employeesRepo = {
    findDeletedEmployeeById: jest.fn().mockResolvedValue({
      id: "e1",
      userId: "u1",
      endDate: null,
    }),
    findDeletedEmployeeByUserId: jest.fn().mockResolvedValue({
      id: "e1",
      userId: "u1",
      endDate: null,
    }),
    findUserIdByUsername: jest.fn().mockResolvedValue({ id: "u1" }),
    transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
    restoreEmployee: jest.fn().mockResolvedValue(undefined),
    ...overrides.employeesRepo,
  };
  const storage = {
    restoreOwnerFiles: jest.fn().mockResolvedValue(undefined),
    ...overrides.storage,
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ requestId: "req-1" }),
    ...overrides.requestContext,
  };
  const identityAdmin = {
    reactivateUser: jest.fn().mockResolvedValue(undefined),
    deactivateUser: jest.fn().mockResolvedValue(undefined),
    ...overrides.identityAdmin,
  };

  const useCase = new RestoreEmployeeUseCase(
    employeesRepo,
    storage,
    requestContext,
  );

  return { useCase, employeesRepo, storage, identityAdmin, tx };
};

describe(RestoreEmployeeUseCase.name, () => {
  it("clears deletedAt and restores archived employee", async () => {
    const { useCase, employeesRepo, tx } = buildUseCase();

    await useCase.execute("e1");

    expect(employeesRepo.restoreEmployee).toHaveBeenCalledWith("e1", tx);
  });

  it("resolves deleted employee by username", async () => {
    const { useCase, employeesRepo } = buildUseCase();

    await useCase.execute("alice");

    expect(employeesRepo.findUserIdByUsername).toHaveBeenCalledWith("alice");
    expect(employeesRepo.findDeletedEmployeeByUserId).toHaveBeenCalledWith("u1");
  });

  it("throws 404 when identifier does not resolve to a deleted employee", async () => {
    const { useCase } = buildUseCase({
      employeesRepo: {
        findDeletedEmployeeById: jest.fn().mockResolvedValue(null),
        findUserIdByUsername: jest.fn().mockResolvedValue(null),
        findDeletedEmployeeByUserId: jest.fn().mockResolvedValue(null),
      },
    });

    const err = await useCase.execute("ghost").catch((e) => e);
    expect(err).toBeDefined();
    expect(err.getResponse()).toMatchObject({
      error: ERROR_CODES.EMPLOYEE_NOT_FOUND,
    });
  });
});
