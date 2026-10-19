import { CreateContractUseCase } from "./use-cases/create-contract.usecase";
import { AmendContractUseCase } from "./use-cases/amend-contract.usecase";

describe("Contracts UseCases Scope Enforcement", () => {
  const sampleContract = {
    id: "c-1",
    employeeId: "emp-1",
    employeeName: "Nguyen Van A",
    employeeCode: "EMP001",
    departmentId: "dept-1",
    departmentName: "Engineering",
    contractNumber: "HD-001",
    contractType: "fixed_term",
    status: "active",
    version: 1,
    signedAt: "2026-01-01",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    fileUrl: null,
    note: null,
    isCurrent: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("enforces department and self scope in CreateContractUseCase", async () => {
    const repo = {
      transaction: jest.fn(async (fn: any) => fn({})),
      create: jest.fn().mockResolvedValue({ id: "c-1" }),
    };
    const queryRepo = {
      findEmployeeDepartmentId: jest.fn().mockResolvedValue("dept-2"),
      findById: jest.fn().mockResolvedValue({ ...sampleContract, departmentId: "dept-2" }),
    };
    const useCase = new CreateContractUseCase(repo as any, queryRepo as any);

    await expect(
      useCase.execute(
        {
          employeeId: "emp-1",
          contractType: "fixed_term" as any,
          effectiveFrom: "2026-01-01",
        },
        { tier: "self", employeeId: "emp-other" },
      ),
    ).rejects.toThrow("Access denied to out-of-scope employee contract");

    await expect(
      useCase.execute(
        {
          employeeId: "emp-1",
          contractType: "fixed_term" as any,
          effectiveFrom: "2026-01-01",
        },
        { tier: "department", departmentId: "dept-1" },
      ),
    ).rejects.toThrow("Access denied to out-of-scope department contract");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("enforces department and self scope in AmendContractUseCase", async () => {
    const repo = {
      transaction: jest.fn(async (fn: any) => fn({})),
      amend: jest.fn().mockResolvedValue({ id: "c-2" }),
    };
    const queryRepo = {
      findById: jest.fn().mockResolvedValue(sampleContract),
    };
    const useCase = new AmendContractUseCase(repo as any, queryRepo as any);

    await expect(
      useCase.execute(
        "c-1",
        { contractType: "permanent" as any },
        { tier: "department", departmentId: "dept-other" },
      ),
    ).rejects.toThrow("Access denied to out-of-scope department contract");
    expect(repo.amend).not.toHaveBeenCalled();
  });
});
