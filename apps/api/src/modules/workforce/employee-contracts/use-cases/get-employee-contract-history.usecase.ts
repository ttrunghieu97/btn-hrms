import { Injectable } from "@nestjs/common";
import { EmployeeContractsRepository } from "../repositories/employee-contracts.repository";
import { EmployeeContractHistoryItemDto } from "../dto/employee-contract-history-item.dto";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetEmployeeContractHistoryUseCase {
  constructor(
    private readonly employeeContractsRepo: EmployeeContractsRepository,
  ) {}

  async execute(employeeId: string): Promise<EmployeeContractHistoryItemDto[]> {
    const exists = await this.employeeContractsRepo.findEmployeeContractSnapshot(
      employeeId,
    );
    if (!exists) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        employeeId,
      });
    }

    const contracts = await this.employeeContractsRepo.getHistory(employeeId);
    return contracts.map((c) => ({
      id: c.id,
      version: c.version,
      previousContractId: c.previousContractId,
      contractType: c.contractType,
      contractStatus: c.status,
      effectiveFrom: c.effectiveFrom,
      effectiveTo: c.effectiveTo,
      signedAt: c.signedAt,
      contractNumber: c.contractNumber,
      isCurrent: c.isCurrent,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
}
