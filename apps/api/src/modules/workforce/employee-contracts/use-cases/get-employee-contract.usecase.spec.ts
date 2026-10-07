import { type EmployeeWithRelations } from "../../employees/repositories/employees.repository";
import { type EmployeeContractsRepository } from "../repositories/employee-contracts.repository";
import { GetEmployeeContractUseCase } from "./get-employee-contract.usecase";

const employeeSnapshot = {
  id: "employee-1",
  employmentRecords: [
    {
      id: "employment-1",
      startDate: "2026-01-01",
      endDate: null,
      isCurrent: true,
    },
  ],
  contracts: [
    {
      id: "contract-1",
      contractType: "permanent",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      status: "active",
      isCurrent: true,
    },
  ],
} satisfies Pick<
  EmployeeWithRelations,
  "id" | "employmentRecords" | "contracts"
>;

describe(GetEmployeeContractUseCase.name, () => {
  it("maps the current employee contract snapshot", async () => {
    const repo = {
      findEmployeeContractSnapshot: jest.fn().mockResolvedValue(employeeSnapshot),
    };
    const useCase = new GetEmployeeContractUseCase(
      repo as unknown as EmployeeContractsRepository,
    );

    await expect(useCase.execute("employee-1")).resolves.toEqual({
      employeeId: "employee-1",
      startDate: "2026-01-01",
      endDate: null,
      contractType: "permanent",
      contractStatus: "active",
    });
  });

  it("fails when the employee does not exist", async () => {
    const repo = {
      findEmployeeContractSnapshot: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetEmployeeContractUseCase(
      repo as unknown as EmployeeContractsRepository,
    );

    await expect(useCase.execute("missing")).rejects.toMatchObject({
      status: 404,
    });
  });
});
