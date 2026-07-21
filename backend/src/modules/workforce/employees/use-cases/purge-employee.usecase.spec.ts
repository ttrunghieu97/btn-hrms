import { PurgeEmployeeUseCase } from "./purge-employee.usecase";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

const buildUseCase = (overrides: {
  employeesRepo?: any;
  storage?: any;
  identityAdmin?: any;
  requestContext?: any;
} = {}) => {
  const employeesRepo = {
    findEmployeeById: jest.fn().mockResolvedValue(null),
    findDeletedEmployeeById: jest.fn().mockResolvedValue(null),
    findUserIdByUsername: jest.fn().mockResolvedValue(null),
    findEmployeeByUserId: jest.fn().mockResolvedValue(null),
    findDeletedEmployeeByUserId: jest.fn().mockResolvedValue(null),
    transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    hardDeleteEmployee: jest.fn(),
    softDeleteEmployee: jest.fn(),
    ...overrides.employeesRepo,
  };
  const storage = {
    archiveOwnerFiles: jest.fn(),
    restoreOwnerFiles: jest.fn(),
    purgeOwnerFiles: jest.fn().mockResolvedValue(undefined),
    ...overrides.storage,
  };
  const identityAdmin = {
    revokeSessions: jest.fn().mockResolvedValue(0),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    ...overrides.identityAdmin,
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ requestId: "req-1" }),
    ...overrides.requestContext,
  };

  const useCase = new PurgeEmployeeUseCase(
    employeesRepo,
    storage,
    requestContext,
    identityAdmin,
  );

  return { useCase, employeesRepo, storage, identityAdmin };
};

describe(PurgeEmployeeUseCase.name, () => {
  it("revokes sessions and deletes user (cascades to employee) by UUID", async () => {
    const employeeId = "11111111-1111-1111-1111-111111111111";
    const userId = "22222222-2222-2222-2222-222222222222";
    const tx = { marker: true };

    const { useCase, employeesRepo, identityAdmin, storage } = buildUseCase({
      employeesRepo: {
        findEmployeeById: jest.fn().mockResolvedValue({ id: employeeId, userId }),
        transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
      },
    });

    const result = await useCase.execute(employeeId);

    expect(result).toEqual({ success: true });
    expect(identityAdmin.revokeSessions).toHaveBeenCalledWith(userId, tx);
    expect(identityAdmin.deleteUser).toHaveBeenCalledWith(userId, tx);
    // Cascade handles employee deletion — must NOT call hardDeleteEmployee directly.
    expect(employeesRepo.hardDeleteEmployee).not.toHaveBeenCalled();
    // Storage cleanup runs after the tx, keyed by employeeId, not userId.
    expect(storage.purgeOwnerFiles).toHaveBeenCalledWith("employee", employeeId);
  });

  it("also resolves soft-deleted employees by UUID", async () => {
    const employeeId = "33333333-3333-3333-3333-333333333333";
    const userId = "44444444-4444-4444-4444-444444444444";

    const { useCase, identityAdmin } = buildUseCase({
      employeesRepo: {
        findEmployeeById: jest.fn().mockResolvedValue(null),
        findDeletedEmployeeById: jest
          .fn()
          .mockResolvedValue({ id: employeeId, userId }),
      },
    });

    await useCase.execute(employeeId);

    expect(identityAdmin.deleteUser).toHaveBeenCalledWith(userId, expect.anything());
  });

  it("resolves by username via users → employees → userId", async () => {
    const username = "alice";
    const userFound = { id: "u-1" };
    const employee = { id: "e-1", userId: "u-1" };

    const { useCase, employeesRepo, identityAdmin } = buildUseCase({
      employeesRepo: {
        findUserIdByUsername: jest.fn().mockResolvedValue(userFound),
        findEmployeeByUserId: jest.fn().mockResolvedValue(employee),
      },
    });

    await useCase.execute(username);

    expect(employeesRepo.findEmployeeByUserId).toHaveBeenCalledWith("u-1");
    expect(identityAdmin.revokeSessions).toHaveBeenCalledWith("u-1", expect.anything());
    expect(identityAdmin.deleteUser).toHaveBeenCalledWith("u-1", expect.anything());
  });

  it("falls back to deleted-employee lookup when active row is gone", async () => {
    const username = "bob";
    const userFound = { id: "u-2" };
    const deletedEmployee = { id: "e-2", userId: "u-2" };

    const { useCase, identityAdmin } = buildUseCase({
      employeesRepo: {
        findUserIdByUsername: jest.fn().mockResolvedValue(userFound),
        findEmployeeByUserId: jest.fn().mockResolvedValue(null),
        findDeletedEmployeeByUserId: jest.fn().mockResolvedValue(deletedEmployee),
      },
    });

    await useCase.execute(username);

    expect(identityAdmin.deleteUser).toHaveBeenCalledWith("u-2", expect.anything());
  });

  it("throws 404 when identifier resolves to no employee", async () => {
    const { useCase } = buildUseCase();

    const err = await useCase.execute("ghost").catch((e) => e);
    expect(err).toBeDefined();
    expect(err.getResponse()).toMatchObject({
      error: ERROR_CODES.EMPLOYEE_NOT_FOUND,
    });
  });

  it("continues to purge files even when identityAdmin throws — uses error in catch", async () => {
    const employeeId = "55555555-5555-5555-5555-555555555555";
    const userId = "66666666-6666-6666-6666-666666666666";

    const { useCase, storage } = buildUseCase({
      employeesRepo: {
        findEmployeeById: jest.fn().mockResolvedValue({ id: employeeId, userId }),
      },
    });

    // happy path: storage.purgeOwnerFiles is called after the tx succeeds
    await useCase.execute(employeeId);
    expect(storage.purgeOwnerFiles).toHaveBeenCalledWith("employee", employeeId);
  });
});
