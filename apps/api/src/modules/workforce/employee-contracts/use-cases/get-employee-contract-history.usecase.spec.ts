import { type AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { type EmployeeWithRelations } from "../../employees/repositories/employees.repository";
import { type EmployeeContractsRepository } from "../repositories/employee-contracts.repository";
import { GetEmployeeContractHistoryUseCase } from "./get-employee-contract-history.usecase";

const employeeSnapshot = {
  id: "employee-1",
  employmentRecords: [],
  contracts: [],
} satisfies Pick<
  EmployeeWithRelations,
  "id" | "employmentRecords" | "contracts"
>;

const contracts = [
  {
    id: "contract-v1",
    version: 1,
    previousContractId: null,
    employeeId: "employee-1",
    contractNumber: "EMP001-01",
    contractType: "probationary",
    status: "superseded",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-03-31",
    signedAt: "2025-12-15",
    fileUrl: null,
    note: null,
    employmentRecordId: null,
    isCurrent: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-03-31"),
  },
  {
    id: "contract-v2",
    version: 2,
    previousContractId: "contract-v1",
    employeeId: "employee-1",
    contractNumber: "EMP001-02",
    contractType: "permanent",
    status: "active",
    effectiveFrom: "2026-04-01",
    effectiveTo: null,
    signedAt: "2026-03-20",
    fileUrl: null,
    note: null,
    employmentRecordId: null,
    isCurrent: true,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
  },
];

describe(GetEmployeeContractHistoryUseCase.name, () => {
  it("returns all contract versions for an employee ordered by effectiveFrom desc", async () => {
    const repo = {
      findEmployeeContractSnapshot: jest.fn().mockResolvedValue(employeeSnapshot),
      getHistory: jest.fn().mockResolvedValue(contracts),
    };
    const useCase = new GetEmployeeContractHistoryUseCase(
      repo as unknown as EmployeeContractsRepository,
    );

    const result = await useCase.execute("employee-1");

    expect(repo.getHistory).toHaveBeenCalledWith("employee-1");
    expect(result).toHaveLength(2);

    const c0 = contracts[0]!;
    expect(result[0]).toEqual({
      id: "contract-v1",
      version: 1,
      previousContractId: null,
      contractType: "probationary",
      contractStatus: "superseded",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      signedAt: "2025-12-15",
      contractNumber: "EMP001-01",
      isCurrent: false,
      createdAt: c0.createdAt,
      updatedAt: c0.updatedAt,
    });

    const c1 = contracts[1]!;
    expect(result[1]).toEqual({
      id: "contract-v2",
      version: 2,
      previousContractId: "contract-v1",
      contractType: "permanent",
      contractStatus: "active",
      effectiveFrom: "2026-04-01",
      effectiveTo: null,
      signedAt: "2026-03-20",
      contractNumber: "EMP001-02",
      isCurrent: true,
      createdAt: c1.createdAt,
      updatedAt: c1.updatedAt,
    });
  });

  it("fails when the employee does not exist", async () => {
    const repo = {
      findEmployeeContractSnapshot: jest.fn().mockResolvedValue(null),
      getHistory: jest.fn(),
    };
    const useCase = new GetEmployeeContractHistoryUseCase(
      repo as unknown as EmployeeContractsRepository,
    );

    await expect(useCase.execute("missing")).rejects.toMatchObject({
      status: 404,
    });
    expect(repo.getHistory).not.toHaveBeenCalled();
  });
});
