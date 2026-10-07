import { RestoreArchivedEmployeeUseCase } from "./restore-archived-employee.usecase";

function makeUseCase(overrides?: Record<string, any>) {
  const emp = { id: "e1", deletedAt: new Date(), status: "working" };
  const employeesRepo = {
    findByIdentifier: jest.fn().mockResolvedValue(emp),
    transaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    restoreEmployee: jest.fn().mockResolvedValue(undefined),
    ...overrides?.employeesRepo,
  };
  const lifecycle = {
    restoreArchive: jest.fn().mockResolvedValue(undefined),
    ...overrides?.lifecycle,
  };
  const requestContext = {
    get: jest.fn().mockReturnValue({ userId: "actor-1" }),
    ...overrides?.requestContext,
  };
  const useCase = new RestoreArchivedEmployeeUseCase(
    employeesRepo,
    lifecycle,
    requestContext,
  );
  return { useCase, employeesRepo, lifecycle, requestContext };
}

describe("RestoreArchivedEmployeeUseCase", () => {
  it("restores an archived (deletedAt) working employee", async () => {
    const { useCase, lifecycle } = makeUseCase();
    await useCase.execute("e1");
    expect(lifecycle.restoreArchive).toHaveBeenCalled();
  });

  it("rejects restore when employee is terminated", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", deletedAt: new Date(), status: "terminated" }),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("e1")).rejects.toThrow();
  });

  it("rejects restore when employee is not archived", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "e1", deletedAt: null, status: "working" }),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("e1")).rejects.toThrow();
  });

  it("rejects when employee not found", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue(null),
    };
    const { useCase } = makeUseCase({ employeesRepo });
    await expect(useCase.execute("e1")).rejects.toThrow();
  });
});
