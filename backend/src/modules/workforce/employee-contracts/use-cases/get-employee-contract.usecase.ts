import { Injectable } from "@nestjs/common";
import { EmployeeContractMapper } from "../mappers/employee-contract.mapper";
import { EmployeeContractsRepository } from "../repositories/employee-contracts.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetEmployeeContractUseCase {
  constructor(
    private readonly employeeContractsRepo: EmployeeContractsRepository,
  ) {}

  async execute(employeeId: string) {
    const employee = await this.employeeContractsRepo.findEmployeeContractSnapshot(employeeId);
    if (!employee) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        employeeId,
      });
    }
    return EmployeeContractMapper.toResponse(employee);
  }
}

