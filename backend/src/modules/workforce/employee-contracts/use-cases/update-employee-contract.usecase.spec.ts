import { type AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { type EmployeeWithRelations } from "../../employees/repositories/employees.repository";
import { type EmployeeContractsRepository } from "../repositories/employee-contracts.repository";
import { UpdateEmployeeContractUseCase } from "./update-employee-contract.usecase";

const employeeSnapshot = {
  id: "employee-1",
  employmentRecords: [
    {
      id: "employment-1",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      isCurrent: true,
    },
  ],
  contracts: [
    {
      id: "contract-1",
      contractType: "probationary",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      status: "active",
      isCurrent: true,
    },
  ],
} satisfies Pick<
  EmployeeWithRelations,
  "id" | "employmentRecords" | "contracts"
>;

describe(UpdateEmployeeContractUseCase.name, () => {
  it("owns the transaction and derives persistence values from the command", async () => {
    const tx = {} as AppDatabase;
    const repo = {
      transaction: jest.fn(
        async (handler: (transaction: AppDatabase) => Promise<unknown>) =>
          handler(tx),
      ),
      findEmployeeContractSnapshot: jest
        .fn()
        .mockResolvedValueOnce(employeeSnapshot)
        .mockResolvedValueOnce(employeeSnapshot),
      upsertCurrentEmploymentRecord: jest
        .fn()
        .mockResolvedValue({ id: "employment-1" }),
      amend: jest.fn().mockResolvedValue({
        id: "contract-1",
      }),
    };
    const useCase = new UpdateEmployeeContractUseCase(
      repo as unknown as EmployeeContractsRepository,
    );

    const result = await useCase.execute("employee-1", {
      contractType: "probationary",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });

    expect(repo.transaction).toHaveBeenCalledTimes(1);
    expect(repo.upsertCurrentEmploymentRecord).toHaveBeenCalledWith(
      "employee-1",
      {
        startDate: "2026-01-01",
        endDate: "2026-03-31",
      },
      tx,
    );
    expect(repo.amend).toHaveBeenCalledWith(
      "employee-1",
      {
        employmentRecordId: "employment-1",
        contractType: "probationary",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-03-31",
      },
      tx,
    );
    expect(result).toEqual({
      employeeId: "employee-1",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      contractType: "probationary",
      contractStatus: "active",
    });
  });

  it("fails before writes when the employee does not exist", async () => {
    const tx = {} as AppDatabase;
    const repo = {
      transaction: jest.fn(
        async (handler: (transaction: AppDatabase) => Promise<unknown>) =>
          handler(tx),
      ),
      findEmployeeContractSnapshot: jest.fn().mockResolvedValue(null),
      upsertCurrentEmploymentRecord: jest.fn(),
      amend: jest.fn(),
    };
    const useCase = new UpdateEmployeeContractUseCase(
      repo as unknown as EmployeeContractsRepository,
    );

    await expect(
      useCase.execute("missing", { contractType: "permanent" }),
    ).rejects.toMatchObject({ status: 404 });
    expect(repo.upsertCurrentEmploymentRecord).not.toHaveBeenCalled();
    expect(repo.amend).not.toHaveBeenCalled();
  });
});
