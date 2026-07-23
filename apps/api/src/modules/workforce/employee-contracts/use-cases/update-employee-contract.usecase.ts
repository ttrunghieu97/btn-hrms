import { Injectable } from "@nestjs/common";
import { UpdateEmployeeContractDto } from "../dto/update-employee-contract.dto";
import { EmployeeContractMapper } from "../mappers/employee-contract.mapper";
import {
  EmployeeContractsRepository,
  type EmployeeContractValues,
  type EmploymentRecordValues,
} from "../repositories/employee-contracts.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

function buildEmploymentRecordValues(
  dto: UpdateEmployeeContractDto,
): EmploymentRecordValues {
  return {
    ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
    ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
  };
}

function buildEmployeeContractValues(
  dto: UpdateEmployeeContractDto,
  employmentRecordId?: string,
): EmployeeContractValues {
  return {
    ...(employmentRecordId ? { employmentRecordId } : {}),
    ...(dto.contractType !== undefined ? { contractType: dto.contractType } : {}),
    ...(dto.startDate !== undefined ? { effectiveFrom: dto.startDate } : {}),
    ...(dto.endDate !== undefined ? { effectiveTo: dto.endDate } : {}),
  };
}

@Injectable()
export class UpdateEmployeeContractUseCase {
  constructor(
    private readonly employeeContractsRepo: EmployeeContractsRepository,
  ) {}

  async execute(employeeId: string, dto: UpdateEmployeeContractDto) {
    const updated = await this.employeeContractsRepo.transaction(async (tx) => {
      const employee = await this.employeeContractsRepo.findEmployeeContractSnapshot(
        employeeId,
        tx,
      );
      if (!employee) {
        throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
          employeeId,
        });
      }

      const employmentRecord =
        await this.employeeContractsRepo.upsertCurrentEmploymentRecord(
          employeeId,
          buildEmploymentRecordValues(dto),
          tx,
        );

      await this.employeeContractsRepo.amend(
        employeeId,
        buildEmployeeContractValues(dto, employmentRecord?.id),
        tx,
      );

      const snapshot = await this.employeeContractsRepo.findEmployeeContractSnapshot(
        employeeId,
        tx,
      );
      if (!snapshot) {
        throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
          employeeId,
        });
      }
      return snapshot;
    });

    return EmployeeContractMapper.toResponse(updated);
  }
}

